# 🦊 Lisi — Twoja lisia anime asystentka

Osobista asystentka AI z modelem 3D (VRM). Działa na **laptopie** (Electron) i **telefonie** (Android). Mówi głosem, widzi Twój ekran, prowadzi kalendarz, zadania, budziki i pamięta o Tobie rzeczy między rozmowami.

---

## ⚡ Szybki start — wersja na laptopa (5 minut)

```bash
# 1. Zainstaluj zależności (w głównym folderze)
npm install

# 2. Uruchom
npm run desktop:dev
```

Po uruchomieniu kliknij **⚙️** → zakładka **API** → wklej darmowy klucz z [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → **Zapisz**. Gotowe — możesz gadać z Lisi na głos lub pisząc.

> To wszystko. Telefon i Supabase są **opcjonalne** — instrukcja w [docs/SETUP.md](docs/SETUP.md).

---

## ✨ Co potrafi

| | Funkcja |
|-|---------|
| 🖥️ | **Model 3D** — Lisi widnieje na ekranie, ma 17 emocji i prawdziwy lip sync (ruch ust z analizy dźwięku) |
| 🎙️ | **Rozmowa głosowa** — mów do mikrofonu, Lisi odpowiada głosem (Gemini Live API) |
| 🛠️ | **Narzędzia** — otwiera strony, klika i pisze na ekranie, widzi Twój ekran, zarządza kalendarzem, zadaniami i budzikami, czyta pliki |
| 🧠 | **Pamięć** — zapamiętuje fakty o Tobie (opcjonalnie w Supabase, między urządzeniami) |
| 📱 | **Telefon** — "Hej Lisi" (wake word), budzik mówiący, kalendarz i zadania głosem |

---

## 📁 Struktura projektu

```
Lisi/
├── packages/
│   ├── shared/      ← Logika wspólna: klient Gemini, narzędzia, Supabase, pamięć
│   ├── desktop/     ← Aplikacja na laptopa (Electron + Three.js, model 3D)
│   └── mobile/      ← Aplikacja na telefon (React Native + Expo)
├── docs/
│   ├── SETUP.md         ← 📖 Instalacja krok po kroku (desktop, .apk, Supabase)
│   └── ARCHITECTURE.md  ← 🔍 Jak wszystko działa od środka
└── supabase/schema.sql  ← Schemat bazy (opcjonalny sync między urządzeniami)
```

---

## 🛠️ Przydatne komendy

| Komenda (z głównego folderu) | Co robi |
|------------------------------|---------|
| `npm run desktop:dev` | Uruchamia Lisi na laptopie (tryb deweloperski) |
| `npm run desktop:build` | Buduje instalator `.exe` (wynik w `packages/desktop/release/`) |
| `npm run mobile:start` | Uruchamia aplikację mobilną przez Expo |
| `npm run mobile:build` | Buduje `.apk` przez EAS |
| `npm run typecheck` | Sprawdza typy TypeScript we wszystkich pakietach |

---

## 📖 Dokumentacja

- **[docs/SETUP.md](docs/SETUP.md)** — pełna instalacja: Node.js, klucz Gemini, build `.exe`, aplikacja na telefon, Supabase, rozwiązywanie problemów.
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — jak Lisi działa od środka: przepływ rozmowy, narzędzia, baza danych, jak coś zmieniać.

---

## 📝 Licencja

Projekt prywatny. Model 3D (`packages/desktop/public/models/Lisi.vrm`) jest autorstwa właściciela repozytorium.

---

<p align="center">
  Stworzone z ❤️ i 🦊
</p>
