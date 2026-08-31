# 🦊 Lisi - Twoja lisia anime asystentka

Lisi to osobista asystentka AI z modelem 3D anime-waifu, działająca na komputerze (Electron/.exe) i telefonie (React Native/.apk).

## ✨ Funkcje

### 🖥️ Wersja komputerowa
- **Kontrola ekranu** - Lisi może klikać, pisać, nawigować po Twoim komputerze
- **Udostępnianie ekranu** - Lisi widzi Twój ekran w czasie rzeczywistym
- **Model 3D VRM** - Wyświetla się na środku ekranu z animacjami
- **Czat tekstowy** - Rozmawiaj z Lisi pisząc lub mówiąc
- **Multitasking** - Lisi wykonuje wiele akcji po kolei

### 📱 Wersja mobilna
- **"Hej Lisi"** - Wywołuj Lisi jak asystenta Google
- **Kalendarz** - Wbudowany kalendarz z synchronizacją
- **Zadania** - Lista zadań z priorytetami
- **Budziki** - Lisi budzi Cię rosnącą głośnością
- **Zastępuje Asystenta Google** - Możesz ustawić jako domyślny asystent

### 🔄 Wspólne funkcje
- **Supabase** - Wszystkie dane synchronizują się między urządzeniami
- **Pamięć długotrwała** - Lisi pamięta ciekawostki o Tobie
- **Ustawienia** - Zmieniaj osobowość, głos, API keys
- **Gemini Live API** - Darmowe AI przez WebSocket
- **Tools Calling** - Lisi wykonuje zadania na Twoim urządzeniu

## 🚀 Szybki start

### Wymagania
- Node.js 18+
- npm lub yarn
- Konto Google (darmowy Gemini API Key)
- Konto Supabase (darmowy tier)

### 1. Pobierz klucze API

**Gemini API Key (darmowy):**
1. Wejdź na [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Kliknij "Create API Key"
3. Skopiuj klucz

**Supabase (darmowy):**
1. Wejdź na [supabase.com](https://supabase.com)
2. Stwórz nowy projekt
3. W SQL Editor uruchom `supabase/schema.sql`
4. Skopiuj URL i Anon Key z Settings > API

### 2. Zainstaluj zależności

```bash
# Zainstaluj wszystkie paczki (monorepo)
npm install

# Lub osobno:
cd packages/shared && npm install
cd packages/desktop && npm install
cd packages/mobile && npm install
```

### 3. Uruchom wersję komputerową

```bash
cd packages/desktop
npm run dev
```

Wpisz klucze API w ustawieniach (ikona ⚙️).

### 4. Uruchom wersję mobilną

```bash
cd packages/mobile
npm start
```

Zeskanuj kod QR w Expo Go (Android) lub uruchom na emulatorze.

### 5. Zbuduj pliki

**Desktop (.exe):**
```bash
cd packages/desktop
npm run build
# Plik .exe w packages/desktop/release/
```

**Mobile (.apk):**
```bash
cd packages/mobile
npm run build:apk
# Plik .apk otrzymasz emailem z EAS Build
```

## 📁 Struktura projektu

```
Lisi/
├── Lisi.vrm                    # Model 3D Lisi (VRoidStudio)
├── README.md
├── package.json                # Monorepo root
├── tsconfig.base.json
├── .env.example
├── supabase/
│   └── schema.sql             # Schemat bazy danych
├── packages/
│   ├── shared/                # Wspólne moduły
│   │   └── src/
│   │       ├── types/         # Typy TypeScript
│   │       ├── gemini/        # Gemini Live API client
│   │       ├── supabase/      # Supabase client
│   │       ├── memory/        # Zarządzanie pamięcią
│   │       └── settings/      # Zarządzanie ustawieniami
│   ├── desktop/               # Aplikacja Electron
│   │   ├── src/
│   │   │   ├── main/          # Proces główny (kontrola ekranu)
│   │   │   ├── preload/       # Preload script (IPC)
│   │   │   └── renderer/      # React + Three.js (UI)
│   │   └── resources/         # Ikony
│   └── mobile/                # Aplikacja React Native
│       ├── src/
│       │   ├── screens/       # Ekrany
│       │   ├── components/    # Komponenty UI
│       │   └── services/      # Serwisy (alarm, kalendarz, audio)
│       └── assets/            # Zasoby
```

## ⚙️ Konfiguracja

### Ustawienia w aplikacji
- **Osobowość** - Zmień system prompt żeby Lisi była jaka chcesz
- **Głos** - Wybierz głos Gemini TTS (Aoede i Kore pasują do Lisi~)
- **Fraza wybudzania** - Domyślnie "Hej Lisi"
- **Motyw** - Ciemny, jasny lub anime

### Supabase Schema
Uruchom `supabase/schema.sql` w Supabase SQL Editor. Tworzy tabele:
- `settings` - Ustawienia użytkownika
- `memories` - Pamięć długotrwała
- `conversation_summaries` - Podsumowania rozmów
- `calendar_events` - Wydarzenia kalendarza
- `tasks` - Zadania
- `alarms` - Budziki
- `chat_messages` - Historia czatu

## 🛠️ Technologie

| Technologia | Zastosowanie |
|-------------|-------------|
| **Electron** | Desktop app (.exe) |
| **React Native + Expo** | Mobile app (.apk) |
| **Three.js + @pixiv/three-vrm** | Model 3D VRM |
| **Gemini Live API** | AI (darmowy, WebSocket) |
| **Supabase** | Baza danych + sync |
| **TypeScript** | Cały kod |
| **Vite** | Bundler desktop |
| **EAS Build** | Build APK |

## 🎨 Model 3D

Model Lisi jest w formacie `.vrm` (stworzony w VRoidStudio). Jest ładowany przez `@pixiv/three-vrm` i wyświetlany za pomocą Three.js.

Animacje:
- **Idle** - Delikatne kołysanie, mruganie
- **Listening** - Pochylona głowa, zainteresowana mina
- **Speaking** - Animacja ust (lip sync), kiwanie głową
- **Executing** - Pomniejszona w rogu ekranu

## 🔊 Budzenie (Mobile)

Lisi budzi Cię stopniowo:
1. Zaczyna cicho (30% głośności)
2. Co 15 sekund zwiększa głośność o 10%
3. Mówi do Ciebie coraz głośniej
4. Nie przestanie dopóki nie powiesz "Wstałem"

## 📝 Licencja

Projekt prywatny. Model 3D Lisi jest autorstwa użytkownika.

---

*Stworzone z ❤️ i 🦊*
