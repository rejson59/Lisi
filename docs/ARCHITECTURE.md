# 🔍 Jak działa Lisi — architektura od środka

Ten dokument tłumaczy **co jest gdzie** i **jak wszystko się łączy**. Czytaj go, gdy chcesz coś zmienić albo naprawić.

---

## 1. Wielki obraz

Lisi to **monorepo** — jedno repozytorium z trzema pakietami:

```
┌─────────────────────────────────────────────────────────────┐
│                     packages/shared                         │
│   (logika wspólna: AI, narzędzia, baza, pamięć, typy)      │
└──────────────┬─────────────────────────┬────────────────────┘
               │                         │
┌──────────────▼─────────────┐ ┌─────────▼──────────────────┐
│      packages/desktop      │ │       packages/mobile      │
│  Electron + Three.js (3D)  │ │  React Native + Expo       │
│  mikrofon, ekran, głos     │ │  budzik, kalendarz, wake   │
└────────────────────────────┘ └────────────────────────────┘
               │                         │
               └────────┬────────────────┘
                        ▼
        ┌────────────────────────────────┐
        │  Gemini Live API (WebSocket)   │ ← mózg: zamienia mowę na mowę
        │  Supabase (opcjonalnie)        │ ← pamięć synchronizowana
        └────────────────────────────────┘
```

| Pakiet | Co to jest | Instalacja |
|--------|-----------|------------|
| `packages/shared` | Biblioteka używana przez oba urządzenia | `npm install` (w głównym folderze, razem z desktopem) |
| `packages/desktop` | Aplikacja na laptopa | `npm install` + `npm run desktop:dev` |
| `packages/mobile` | Aplikacja na telefon | osobno: `cd packages/mobile && npm install` (Expo lubi mieć własne node_modules) |

---

## 2. `packages/shared` — wspólna logika

| Plik | Rola |
|------|------|
| `src/types/index.ts` | Wszystkie typy + **domyślny system prompt** (osobowość Lisi) + lista 17 emocji |
| `src/gemini/live-client.ts` | Klient **Gemini Live API** — połączenie WebSocket, wysyłanie audio, odbieranie odpowiedzi |
| `src/gemini/audio.ts` | Konwersje audio (PCM/base64), resampling, bufor odtwarzania, nagrywanie z mikrofonu |
| `src/gemini/tools.ts` | **32 narzędzia** Lisi + deklaracje dla Gemini + filtrowanie po platformie |
| `src/supabase/client.ts` | Funkcje do bazy (zapis/odczyt ustawień, pamięci, zadań…) |
| `src/supabase/sync.ts` | Synchronizacja danych między urządzeniami |
| `src/memory/manager.ts` | Pamięć długotrwała — Lisi zapisuje i wyszukuje fakty o Tobie |
| `src/settings/manager.ts` | Zarządzanie ustawieniami (+ subskrypcja zmian z Supabase) |
| `src/spotify/service.ts` | Sterowanie Spotify przez Web API (wymaga własnego Client ID) |

**Jak pakiety go używają?**
- **Desktop (renderer)** importuje shared przez alias `@shared/*` → Vite wbudowuje kod w bundle (nie trzeba nic budować).
- **Mobile** importuje typy relatywnie (`../shared/src/types`) → Metro czyta pliki bezpośrednio z `packages/shared` (skonfigurowane w `metro.config.js`).

---

## 3. Desktop — trzy warstwy Electrona

```
src/
├── main/            ← proces główny (Node.js): okno, ikona tray, kontrola ekranu, pliki
│   ├── index.ts         tworzy okno, rejestruje wszystkie IPC
│   ├── screen-control.ts  symulacja myszy/klawiatury (xdotool/PowerShell/AppleScript)
│   ├── screen-capture.ts  zrzuty i strumień ekranu (desktopCapturer → JPEG base64)
│   └── updater.ts         auto-aktualizacje z GitHub Releases
├── preload/         ← mostek: wystawia bezpieczne API `window.lisi` dla strony
└── renderer/        ← całe UI (React + Vite): model 3D, czat, panele
    ├── App.tsx           serce UI — łączy wszystko
    ├── components/
    │   ├── VRMViewer.tsx   scena Three.js + model VRM
    │   ├── emotions.ts     silnik emocji (17 wyrazów twarzy, płynne przejścia)
    │   ├── lip-sync.ts     ruch ust z analizy dźwięku (FFT przez Web Audio API)
    │   ├── ChatPanel.tsx, SettingsPanel.tsx, CalendarPanel.tsx,
    │   ├── TasksPanel.tsx, AlarmsPanel.tsx, ControlBar.tsx, Titlebar.tsx
    ├── hooks/
    │   ├── useGemini.ts    połączenie z Gemini + obsługa narzędzi
    │   └── useScreenShare.ts  udostępnianie ekranu do AI
    └── public/models/Lisi.vrm  ← model 3D (serwowany przez Vite z `/models/...`)
```

**Zasada bezpieczeństwa:** renderer **nie ma** dostępu do Node. Każda operacja "systemowa" (klik, plik, zrzut ekranu) idzie przez `window.lisi.*` → IPC → proces główny (`ipcMain.handle` w `main/index.ts`). Chcesz dodać nową zdolność systemową? Dodaj handler w `main/index.ts`, odpowiednik w `preload/index.ts` i dopiero potem używaj w rendererze.

**Model 3D:** `VRMViewer` pobiera `./models/Lisi.vrm`. W deweloperskim serwuje go Vite z folderu `public/`, w zbudowanej aplikacji plik ląduje obok `index.html` w `dist/renderer/models/`.

**Lip sync:** odpowiedź głosowa z Gemini jest odtwarzana przez `AudioContext` → `AnalyserNode` liczy FFT → `lip-sync.ts` zamienia głośność/wysokość dźwięku na stopień otwarcia ust → `VRMViewer` ustawia blendshape `aa` na modelu. Stąd usta poruszają się naprawdę w rytm mowy.

**Emocje:** Gemini ma narzędzie `set_emotion`. Gdy je wywoła (np. `happy`), renderer płynnie przenika wyrazy twarzy VRM (silnik `emotions.ts` obsługuje wagi i czas przejścia). Dodatkowo stany aplikacji (słucham/myślę/mówię) podświetlają UI.

---

## 4. Rozmowa głosowa — przepływ krok po kroku

```
 Ty mówisz                                          Lisi odpowiada
┌──────────┐  PCM 16 kHz,   ┌───────────────┐      ┌───────────────┐ audio 24 kHz ┌──────────┐
│ mikrofon │ ────16-bit────▶│ Gemini Live   │ ───▶ │ AudioBuffer   │─────────────▶│ głośniki │
│ (mic)    │  base64, WS    │ API (WebSocket)      │ Manager       │  + tekst     └──────────┘
└──────────┘                └───────┬───────┘      └───────────────┘      + lip sync
                                    │                     ▲
                                    │ tool_call           │ tekst → czat
                                    ▼                     │
                          ┌──────────────────┐            │
                          │ handler narzędzia│────────────┘
                          │ (otwórz stronę,  │  wynik wraca do Gemini,
                          │  dodaj zadanie…) │  więc Lisi "wie", że wykonała akcję
                          └──────────────────┘
```

1. Mikrofon nagrywa dźwięk (`MicrophoneCapture`), resampluje do **16 kHz mono PCM 16-bit**, koduje do base64 i wysyła przez WebSocket do Gemini.
2. Gemini (model `gemini-3.1-flash-live-preview`) analizuje mowę **w czasie rzeczywistym**.
3. Odpowiedź przychodzi równolegle jako **audio** (24 kHz, odtwarzane natychmiast) i **tekst** (widoczny na czacie).
4. Jeśli Lisi zdecyduje użyć narzędzia (np. "dodaj zadanie"), Gemini wysyła `toolCall` → `useGemini.ts` znajduje handler → wykonuje → wynik wraca do rozmowy.
5. Emocje: Lisi zwykle zaczyna odpowiedź od wywołania `set_emotion`, więc twarz pasuje do słów.

Kluczowe połączenie: `wss://generativelanguage.googleapis.com/...BidiGenerateContent?key=KLUCZ` (zobacz `live-client.ts`).

---

## 5. Narzędzia (32) — czym Lisi dysponuje

Zdefiniowane w `shared/src/gemini/tools.ts`, każde z flagą platformy:

| Kategoria | Narzędzia |
|-----------|-----------|
| Twarz | `set_emotion` |
| Czas | `get_current_time`, `set_timer` |
| Przeglądarka/ekran | `open_browser`, `click_screen`, `type_text`, `press_key`, `scroll`, `get_screen_size` |
| Kalendarz | `add_calendar_event`, `list_calendar_events`, `delete_calendar_event` |
| Zadania | `add_task`, `list_tasks`, `complete_task`, `delete_task` |
| Budziki | `set_alarm`, `list_alarms`, `delete_alarm` |
| Pamięć | `save_memory`, `search_memory` |
| Spotify | `spotify_play/pause/next/previous`, `spotify_volume`, `spotify_shuffle`, `spotify_repeat`, `spotify_search`, `spotify_now_playing` |
| Pliki (desktop) | `read_file`, `write_file` |

**Dodanie własnego narzędzia = 3 kroki:**
1. Dodaj deklarację do `ALL_TOOLS` w `tools.ts` (nazwa, opis, parametry, platformy),
2. Dodaj obsługę w `findToolHandler` / miejscu wykonania (desktop: `useGemini.ts` lub IPC; mobile: `HomeScreen.tsx`),
3. Dopisz krótką wzmiankę w system promptcie, jeśli ma być używana proaktywnie.

---

## 6. Mobile — aplikacja na telefon

```
App.tsx                    nawigacja (Home/Settings/Calendar/Tasks) + stan globalny
src/screens/
├── HomeScreen.tsx         główny ekran: czat, mikrofon (STT), mówienie (TTS), Gemini
├── SettingsScreen.tsx     klucze API, osobowość, głos, fraza wybudzania
├── CalendarScreen.tsx     kalendarz urządzenia (expo-calendar)
└── TasksScreen.tsx        lista zadań (lokalnie lub Supabase)
src/services/
├── AudioService.ts        mikrofon + odtwarzanie (expo-av) + TTS (expo-speech)
├── WakeWordService.ts     słuchanie w tle frazy "Hej Lisi" (@react-native-voice/voice)
├── AlarmService.ts        budzik: notyfikacja + rosnąca głośność + Lisi mówi, aż wstaniesz
├── CalendarService.ts     pomost do systemowego kalendarza
└── UpdateService.ts       aktualizacje OTA (expo-updates)
assets/sounds/alarm.wav    dźwięk budzika
```

**Budzik krok po kroku:** zapisany budzik → `scheduleNotificationAsync` (dokładny czas) → przy wyzwoleniu `AlarmOverlay` (pełny ekran nad innymi aplikacjami) → odtwarzanie `alarm.wav` w pętli z rosnącą głośnością → Lisi pyta TTS, czy już wstajesz → dopiero przycisk "Wstaję!" wycisza budzik.

**Różnice vs desktop:** brak modelu 3D (moc oszczędzana na mowę i STT), mowa przez `expo-speech` zamiast audio z Gemini, pisanie przez rozpoznawanie mowy systemowej. Narzędzia są filtrowane — `getToolsForPlatform('mobile')` zwraca tylko te z flagą `mobile`.

---

## 7. Supabase — baza danych (opcjonalna)

Schemat: [`supabase/schema.sql`](../supabase/schema.sql) (wklej do SQL Editora w Supabase).

| Tabela | Do czego służy |
|--------|----------------|
| `settings` | Ustawienia (osobowość, głos, klucze) — sync laptop ↔ telefon |
| `memories` | Pamięć długotrwała (fakty, preferencje, ważność 1–10) |
| `conversation_summaries` | Podsumowania rozmów |
| `calendar_events` / `tasks` / `alarms` | Wydarzenia, zadania, budziki |
| `chat_messages` | Historia czatu |

**Ważne:** bez Supabase wszystko działa lokalnie (localStorage na desktopie, AsyncStorage na telefonie). Supabase dodaje tylko synchronizację między urządzeniami. Klucz w bazie to tzw. *anon key* — dostęp kontrolują polityki RLS w schemacie.

---

## 8. Build i publikacja

**Desktop (.exe):** `npm run desktop:build` → TypeScript (proces główny) + Vite (UI) + `electron-builder` (konfiguracja: `packages/desktop/electron-builder.yml`, ikony w `packages/desktop/resources/`). Publikacja na GitHub Releases jest już skonfigurowana (`publish: provider: github`), a zainstalowana aplikacja sprawdza aktualizacje przez `electron-updater`.

**Mobile (.apk):** `cd packages/mobile && eas build -p android --profile preview`. Aktualizacje bez sklepu: `eas update` (wymaga uzupełnienia `projectId` w `app.json`).

---

## 9. Jak coś zmienić — ściąga

| Chcę… | Zrób to |
|-------|---------|
| Zmienić osobowość | Ustawienia ⚙️ w aplikacji (System Prompt) albo domyślne w `shared/src/types/index.ts` → `DEFAULT_SETTINGS.system_prompt` |
| Zmienić głos | Ustawienia ⚙️ → Głos (`voice_name` w `live-client.ts` to wartość domyślna) |
| Dodać narzędzie | 3 kroki w sekcji 5 powyżej |
| Dodać emocję | `emotions.ts` (desktop) + wzmianka w system prompcie |
| Zmienić wygląd | `renderer/styles/global.css` (motywy na dole pliku) |
| Podmienić model 3D | Wstaw nowy `.vrm` do `packages/desktop/public/models/Lisi.vrm` |
| Zmienić model AI | `shared/src/gemini/live-client.ts` → `model` w konstruktorze |

---

## 10. Znane ograniczenia (uczciwie)

- **Kontrola ekranu** działa przez komendy systemowe (`xdotool` / PowerShell / AppleScript) — to proste, ale bywa kruche; docelowo lepiej użyć `@nut-tree/nut-js`.
- **Spotify** wymaga własnej aplikacji w [developer.spotify.com](https://developer.spotify.com) (Client ID + redirect URI) i Premium do odtwarzania.
- **Mobile łączy się z Gemini przez import źródeł shared** — działa, bo Metro czyta pliki z `packages/shared`; przy większych zmianach w shared wystarczy zrestartować `expo start`.
- **Aktualizacje OTA** (telefon) i auto-update (.exe) wymagają publikowania release'ów — bez tego po prostu nic nie sprawdzają.
- **iOS** nie jest jeszcze konfigurowany (brak profilu builda w `eas.json`), ale kod jest wieloplatformowy.
