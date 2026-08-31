# 🦊 Lisi - Twoja lisia anime asystentka

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Electron-2B2E3A?style=for-the-badge&logo=electron&logoColor=9FEAF9" />
  <img src="https://img.shields.io/badge/React_Native-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Gemini_AI-E37400?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" />
</p>

Osobista asystentka AI z modelem 3D anime-waifu. Działa na **laptopie** (.exe) i **telefonie** (.apk). Całkowicie **darmowa**.

> 📖 **Pełna instrukcja instalacji:** [SETUP.md](./SETUP.md)

---

## ⚡ Szybki start (3 minuty)

```bash
# 1. Sklonuj repo
git clone https://github.com/TWOJ_USERNAME/Lisi.git
cd Lisi

# 2. Zainstaluj
npm install

# 3. Uruchom na laptopie
cd packages/desktop
npm install
npm run dev
```

Potem kliknij **⚙️** → **API** → wklej darmowy klucz z [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

---

## ✨ Co potrafi

### 🖥️ Na laptopie
| Funkcja | Opis |
|---------|------|
| **Model 3D VRM** | Lisi wyświetla się na środku ekranu z animacjami twarzy |
| **Prawdziwy lip sync** | Analiza audio w czasie rzeczywistym → ruchy ust |
| **17 emocji** | Lisi sama wybiera wyraz twarzy (happy, shy, angry, love...) |
| **Kontrola ekranu** | Otwiera strony, klika, pisze na klawiaturze |
| **Udostępnianie ekranu** | Lisi widzi Twój ekran na żywo |
| **Czat + głos** | Rozmawiaj pisząc lub mówiąc do mikrofonu |

### 📱 Na telefonie
| Funkcja | Opis |
|---------|------|
| **"Hej Lisi"** | Wywołuj jak Asystenta Google |
| **Budzik** | Lisi budzi Cię rosnącą głośnością, mówi dopóki nie wstaniesz |
| **Kalendarz** | Dodawaj/edytuj wydarzenia głosem |
| **Zadania** | Lista zadań z priorytetami |
| **Domyślny asystent** | Może zastąpić Asystenta Google |

### 🔄 Na obu
| Funkcja | Opis |
|---------|------|
| **Supabase sync** | Ustawienia i dane synchronizują się między urządzeniami |
| **Pamięć długotrwała** | Lisi pamięta ciekawostki o Tobie |
| **Tools calling** | 20+ narzędzi (przeglądarka, kalendarz, budziki, pliki...) |
| **Darmowe AI** | Gemini 2.0 Flash Live Preview (WebSocket, audio, tools) |
| **Auto-aktualizacje** | Desktop: GitHub Releases, Mobile: OTA (Expo Updates) |

---

## 🏗️ Architektura

```
Lisi/
├── Lisi.vrm                    ← Model 3D (VRoidStudio)
├── packages/
│   ├── shared/                 ← Gemini API, Supabase, pamięć, narzędzia
│   ├── desktop/                ← Electron (Three.js + lip sync + emocje)
│   └── mobile/                 ← React Native (budzik, kalendarz, wake word)
└── supabase/schema.sql         ← Schemat bazy danych
```

---

## 🛠️ Technologie

| | Technologia | Dlaczego |
|-|-------------|----------|
| 🤖 | **Gemini 2.0 Flash Live** | Darmowe AI z audio, tools calling, WebSocket |
| 🗄️ | **Supabase** | Darmowa baza + realtime sync między urządzeniami |
| 🦊 | **Three.js + @pixiv/three-vrm** | Renderowanie modelu 3D VRM |
| 🖥️ | **Electron** | Desktop app → .exe |
| 📱 | **React Native + Expo** | Mobile app → .apk |
| 🎤 | **Web Audio API** | Lip sync z analizą FFT |

---

## 📖 Instalacja

**Pełna instrukcja krok po kroku:** → **[SETUP.md](./SETUP.md)**

### Wymagania
- [Node.js 18+](https://nodejs.org) (LTS)
- [Git](https://git-scm.com)
- Darmowy klucz [Gemini API](https://aistudio.google.com/apikey)

### Desktop (.exe)
```bash
npm install
cd packages/desktop && npm install && npm run dev
```

### Mobile (.apk)
```bash
cd packages/mobile && npm install
npx expo start                    # tryb deweloperski
eas build -p android --profile preview  # build .apk
```

---

## 🎨 Personalizacja

Lisi jest w pełni konfigurowalna przez ustawienia (ikona ⚙️):

- **Osobowość** - Zmień system prompt (np. "Jesteś poważną asystentką" lub "Jesteś szaloną lisicą!")
- **Głos** - 8 głosów Gemini TTS (Aoede i Kore pasują do Lisi~)
- **Fraza wybudzania** - Domyślnie "Hej Lisi", możesz zmienić
- **Motyw** - Ciemny, jasny lub anime
- **Emocje** - Lisi sama wybiera wyraz twarzy przez tools calling

---

## 📝 Licencja

Projekt prywatny. Model 3D `Lisi.vrm` jest autorstwa właściciela repozytorium.

---

<p align="center">
  Stworzone z ❤️ i 🦊<br/>
  <sub>Lisi - Twoja lisia anime asystentka</sub>
</p>
