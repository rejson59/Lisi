# 🛠️ Instrukcja instalacji Lisi

Krok po kroku jak uruchomić Lisi na laptopie i telefonie.

---

## 📋 Co potrzebujesz (wszystko darmowe)

| Co | Po co | Gdzie pobrać |
|----|-------|--------------|
| **Node.js 18+** | Uruchamianie kodu | [nodejs.org](https://nodejs.org) (pobierz LTS) |
| **Git** | Pobranie kodu | [git-scm.com](https://git-scm.com) |
| **Gemini API Key** | Darmowe AI | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| **Supabase** | Baza danych + sync | [supabase.com](https://supabase.com) (darmowy tier) |

---

## 🖥️ Część 1: Wersja na laptop (.exe)

### Krok 1: Pobierz kod

```bash
git clone https://github.com/TWOJ_USERNAME/Lisi.git
cd Lisi
```

### Krok 2: Zainstaluj Node.js

1. Wejdź na [nodejs.org](https://nodejs.org)
2. Pobierz wersję **LTS** (zalecaną)
3. Zainstaluj (klikaj "Next" na wszystkim)
4. Sprawdź czy działa - otwórz terminal/cmd i wpisz:
```bash
node --version
```
Powinno pokazać `v18.x.x` lub `v20.x.x`

### Krok 3: Pobierz klucz Gemini (darmowy)

1. Wejdź na [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Zaloguj się kontem Google
3. Kliknij **"Create API Key"**
4. Wybierz projekt (lub stwórz nowy)
5. **Skopiuj** klucz (zaczyna się od `AIza...`)
6. **Zachowaj** ten klucz - będziesz go potrzebować

### Krok 4: (Opcjonalnie) Supabase - synchronizacja między urządzeniami

Jeśli chcesz żeby ustawienia i dane synchronizowały się między laptopem a telefonem:

1. Wejdź na [supabase.com](https://supabase.com)
2. Zarejestruj się (darmowe)
3. Kliknij **"New Project"**
4. Wypełnij dane (nazwa, hasło, region)
5. Poczekaj aż projekt się stworzy (~2 minuty)
6. W lewym menu kliknij **"SQL Editor"**
7. Kliknij **"New Query"**
8. Wklej zawartość pliku `supabase/schema.sql`
9. Kliknij **"Run"** (zielony przycisk)
10. Idź do **Settings** → **API**
11. Skopiuj **Project URL** (np. `https://xxxxx.supabase.co`)
12. Skopiuj **anon public** key (zaczyna się od `eyJ...`)

### Krok 5: Zainstaluj i uruchom

Otwórz terminal w folderze Lisi i wpisz:

```bash
# 1. Zainstaluj zależności
npm install

# 2. Zbuduj shared package
cd packages/shared
npm install
cd ../..

# 3. Zainstaluj zależności desktop
cd packages/desktop
npm install

# 4. Uruchom!
npm run dev
```

Pierwsze uruchomienie może potrwać ~30 sekund (Vite musi zbudować).

### Krok 6: Wpisz klucze API

1. Po uruchomieniu kliknij **⚙️** (ustawienia) w prawym górnym rogu
2. Przejdź do zakładki **API**
3. Wklej **Gemini API Key**
4. (Opcjonalnie) Wklej **Supabase URL** i **Supabase Anon Key**
5. Kliknij **Zapisz**

### Krok 7: Zbuduj plik .exe (do dystrybucji)

```bash
cd packages/desktop
npm run build
```

Plik `.exe` pojawi się w `packages/desktop/release/`

---

## 📱 Część 2: Wersja na telefon (.apk)

### Krok 1: Zainstaluj Expo CLI

```bash
npm install -g eas-cli
```

### Krok 2: Zaloguj się do Expo

```bash
cd packages/mobile
npx expo login
```

### Krok 3: Zainstaluj zależności

```bash
npm install
```

### Krok 4: Uruchom na telefonie (tryb deweloperski)

1. Pobierz aplikację **Expo Go** z Google Play
2. W terminalu wpisz:
```bash
npx expo start
```
3. Zeskanuj kod QR aparatem telefonu
4. Lisi otworzy się w Expo Go

### Krok 5: Zbuduj plik .apk (do instalacji bez Expo Go)

```bash
cd packages/mobile
eas build -p android --profile preview
```

1. EAS zapyta o konfigurację - wybierz domyślne
2. Build trwa ~10-15 minut
3. Po zakończeniu dostaniesz link do pobrania .apk
4. Pobierz .apk na telefon
5. W ustawieniach telefonu włącz **"Nieznane źródła"** (Settings → Security)
6. Zainstaluj .apk

### Krok 6: Ustaw jako domyślny asystent (opcjonalnie)

1. Idź do **Ustawienia** → **Aplikacje** → **Domyślne aplikacje**
2. Znajdź **Asystent i wprowadzanie głosowe**
3. Wybierz **Lisi** zamiast Asystenta Google

---

## 🔧 Rozwiązywanie problemów

### "npm install" nie działa
```bash
# Wyczyść cache
npm cache clean --force
# Usuń node_modules i spróbuj ponownie
rm -rf node_modules
npm install
```

### "Nie mogę uruchomić - brak modułu"
```bash
# Zbuduj shared package najpierw
cd packages/shared
npm install
npm run build
cd ../..
```

### "Błąd połączenia z Gemini"
- Sprawdź czy klucz API jest poprawny (zaczyna się od `AIza`)
- Sprawdź czy masz internet
- Wejdź na [aistudio.google.com](https://aistudio.google.com) i sprawdź czy klucz jest aktywny

### "Model VRM się nie wyświetla"
- Upewnij się że plik `Lisi.vrm` jest w głównym folderze projektu
- Sprawdź konsolę przeglądarki (F12) czy nie ma błędów

### "Budzik nie działa na telefonie"
- W ustawieniach telefonu daj Lisi uprawnienia do:
  - Wyświetlania nad innymi aplikacjami
  - Działania w tle
  - Dostępu do nie wyłączaj ekranu

---

## 📁 Ważne pliki

| Plik | Co to jest |
|------|-----------|
| `Lisi.vrm` | Model 3D Lisi (Twój!) |
| `supabase/schema.sql` | Schemat bazy danych |
| `.env.example` | Przykład zmiennych środowiskowych |
| `packages/shared/src/types/index.ts` | Domyślny system prompt Lisi |

---

## 🎨 Personalizacja

### Zmień osobowość Lisi

W ustawieniach → **Ogólne** → **System Prompt**

Przykłady:
```
Jesteś Lisi - poważna asystentka. Mówisz zwięźle i profesjonalnie.
```
```
Jesteś Lisi - szalona lisia waifu! Używasz dużo "nya~" i "desu!" i jesteś mega energiczna!
```

### Zmień głos

W ustawieniach → **Głos**:
- **Aoede** - żeński, melodyjny (polecam!)
- **Kore** - żeński, ciepły
- **Puck** - męski, energiczny
- **Charon** - męski, spokojny

---

*Powodzenia z Lisi! 🦊✨*
