// ============================================================
// Screen Control - Kontrola myszy i klawiatury
// Używa robotjs (lub nut-js) do symulacji wejścia
// ============================================================

/**
 * ScreenController - kontroluje mysz i klawiaturę
 * 
 * Wymaga zainstalowania: npm install @nut-tree/nut-js
 * Lub alternatywnie: npm install robotjs
 * 
 * Na razie implementacja z użyciem prostych komend systemowych
 * W produkcji użyj @nut-tree/nut-js dla lepszej kontroli
 */
export class ScreenController {
  
  /** Kliknij w pozycji (x, y) */
  async click(x: number, y: number): Promise<void> {
    console.log(`[Screen] Klikam w (${x}, ${y})`);
    // Implementacja z robotjs:
    // robot.moveMouse(x, y);
    // robot.mouseClick();
    
    // Tymczasowa implementacja z xdotool (Linux) / PowerShell (Windows) / osascript (macOS)
    await this.executeClick(x, y, 'left');
  }

  /** Podwójne kliknięcie */
  async doubleClick(x: number, y: number): Promise<void> {
    console.log(`[Screen] Podwójne kliknięcie w (${x}, ${y})`);
    await this.executeClick(x, y, 'double');
  }

  /** Kliknięcie prawym przyciskiem */
  async rightClick(x: number, y: number): Promise<void> {
    console.log(`[Screen] Prawe kliknięcie w (${x}, ${y})`);
    await this.executeClick(x, y, 'right');
  }

  /** Wpisz tekst */
  async type(text: string): Promise<void> {
    console.log(`[Screen] Wpisuję: "${text}"`);
    const { exec } = require('child_process');
    
    return new Promise((resolve, reject) => {
      let cmd: string;
      
      switch (process.platform) {
        case 'win32':
          // PowerShell - wyślij klawisze
          cmd = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${text.replace(/'/g, "''")}')"`;
          break;
        case 'darwin':
          // macOS - osascript
          cmd = `osascript -e 'tell application "System Events" to keystroke "${text.replace(/"/g, '\\"')}"'`;
          break;
        default:
          // Linux - xdotool
          cmd = `xdotool type --clearmodifiers "${text.replace(/"/g, '\\"')}"`;
      }
      
      exec(cmd, (error: any) => {
        if (error) {
          console.error('[Screen] Błąd wpisywania:', error);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /** Naciśnij klawisz lub kombinację */
  async pressKey(key: string): Promise<void> {
    console.log(`[Screen] Naciskam: ${key}`);
    const { exec } = require('child_process');
    
    return new Promise((resolve, reject) => {
      let cmd: string;
      
      // Mapowanie klawiszy
      const keyMap: Record<string, string> = {
        'enter': 'Return',
        'tab': 'Tab',
        'escape': 'Escape',
        'backspace': 'BackSpace',
        'delete': 'Delete',
        'space': 'space',
        'up': 'Up',
        'down': 'Down',
        'left': 'Left',
        'right': 'Right',
        'home': 'Home',
        'end': 'End',
        'pageup': 'Page_Up',
        'pagedown': 'Page_Down',
        'f1': 'F1', 'f2': 'F2', 'f3': 'F3', 'f4': 'F4',
        'f5': 'F5', 'f6': 'F6', 'f7': 'F7', 'f8': 'F8',
        'f9': 'F9', 'f10': 'F10', 'f11': 'F11', 'f12': 'F12',
      };
      
      // Obsłuż kombinacje (np. "ctrl+c", "alt+tab")
      const parts = key.toLowerCase().split('+');
      
      switch (process.platform) {
        case 'win32': {
          // Mapowanie na SendKeys
          const winKeyMap: Record<string, string> = {
            'enter': '{ENTER}', 'tab': '{TAB}', 'escape': '{ESC}',
            'backspace': '{BACKSPACE}', 'delete': '{DELETE}',
            'space': ' ', 'up': '{UP}', 'down': '{DOWN}',
            'left': '{LEFT}', 'right': '{RIGHT}',
            'ctrl': '^', 'alt': '%', 'shift': '+',
          };
          
          let sendKeys = '';
          for (const part of parts) {
            if (winKeyMap[part] && ['^', '%', '+'].includes(winKeyMap[part])) {
              sendKeys += winKeyMap[part];
            } else {
              sendKeys += winKeyMap[part] || part;
            }
          }
          
          cmd = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${sendKeys}')"`;
          break;
        }
        case 'darwin': {
          const macModifiers: string[] = [];
          const macKey = parts[parts.length - 1];
          
          for (const part of parts.slice(0, -1)) {
            switch (part) {
              case 'ctrl': macModifiers.push('control down'); break;
              case 'alt': macModifiers.push('option down'); break;
              case 'shift': macModifiers.push('shift down'); break;
              case 'meta': case 'cmd': macModifiers.push('command down'); break;
            }
          }
          
          const modifierStr = macModifiers.length > 0 
            ? ` using {${macModifiers.join(', ')}}` 
            : '';
          
          cmd = `osascript -e 'tell application "System Events" to key code "${macKey}"${modifierStr}'`;
          break;
        }
        default: {
          // Linux - xdotool
          let xdoKeys = '';
          for (const part of parts) {
            if (['ctrl', 'alt', 'shift', 'super'].includes(part)) {
              xdoKeys += part + '+';
            } else {
              xdoKeys += keyMap[part] || part;
            }
          }
          cmd = `xdotool key --clearmodifiers ${xdoKeys}`;
        }
      }
      
      exec(cmd, (error: any) => {
        if (error) {
          console.error('[Screen] Błąd klawisza:', error);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /** Przewiń ekran */
  async scroll(direction: 'up' | 'down', amount: number): Promise<void> {
    console.log(`[Screen] Przewijam ${direction}, ${amount}`);
    const { exec } = require('child_process');
    
    return new Promise((resolve, reject) => {
      let cmd: string;
      const clicks = amount * 3;
      
      switch (process.platform) {
        case 'win32':
          // PowerShell scroll
          const scrollAmount = direction === 'up' ? clicks : -clicks;
          cmd = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{${direction === 'up' ? 'UP' : 'DOWN'}}')"`;
          break;
        case 'darwin':
          cmd = `osascript -e 'tell application "System Events' to scroll ${direction === 'up' ? clicks : -clicks}'`;
          break;
        default:
          cmd = `xdotool click ${direction === 'up' ? 4 : 5}`;
          // Powtórz dla amount
          for (let i = 1; i < amount; i++) {
            cmd += ` && xdotool click ${direction === 'up' ? 4 : 5}`;
          }
      }
      
      exec(cmd, (error: any) => {
        if (error) {
          console.error('[Screen] Błąd przewijania:', error);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /** Przesuń mysz */
  async moveMouse(x: number, y: number): Promise<void> {
    const { exec } = require('child_process');
    
    return new Promise((resolve, reject) => {
      let cmd: string;
      
      switch (process.platform) {
        case 'win32':
          cmd = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})"`;
          break;
        case 'darwin':
          cmd = `osascript -e 'tell application "System Events" to set position of mouse to {${x}, ${y}}'`;
          break;
        default:
          cmd = `xdotool mousemove ${x} ${y}`;
      }
      
      exec(cmd, (error: any) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  /** Pobierz rozmiar ekranu */
  async getScreenSize(): Promise<{ width: number; height: number }> {
    const { screen } = require('electron');
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    return { width, height };
  }

  // ---- Prywatne metody ----
  
  private async executeClick(x: number, y: number, button: 'left' | 'right' | 'double'): Promise<void> {
    const { exec } = require('child_process');
    
    return new Promise((resolve, reject) => {
      let cmd: string;
      
      switch (process.platform) {
        case 'win32':
          // Windows - PowerShell z System.Windows.Forms
          const winButton = button === 'right' ? 'Right' : 'Left';
          cmd = `powershell -Command "
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
            if ('${button}' -eq 'double') {
              [System.Windows.Forms.SendKeys]::SendWait('{CLICK ${x} ${y}}')
              Start-Sleep -Milliseconds 50
              [System.Windows.Forms.SendKeys]::SendWait('{CLICK ${x} ${y}}')
            } else {
              [System.Windows.Forms.SendKeys]::SendWait('{CLICK ${x} ${y}}')
            }
          "`;
          break;
        case 'darwin':
          if (button === 'right') {
            cmd = `clic -x ${x} -y ${y} -r`;
          } else if (button === 'double') {
            cmd = `clic -x ${x} -y ${y} && sleep 0.05 && clic -x ${x} -y ${y}`;
          } else {
            cmd = `clic -x ${x} -y ${y}`;
          }
          break;
        default:
          // Linux - xdotool
          const xdoButton = button === 'right' ? '3' : '1';
          if (button === 'double') {
            cmd = `xdotool mousemove ${x} ${y} click --repeat 2 1`;
          } else {
            cmd = `xdotool mousemove ${x} ${y} click ${xdoButton}`;
          }
      }
      
      exec(cmd, (error: any) => {
        if (error) {
          console.error('[Screen] Błąd kliknięcia:', error);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}
