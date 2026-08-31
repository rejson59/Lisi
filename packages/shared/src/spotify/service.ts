// ============================================================
// Spotify Service - Kontrola muzyki ze Spotify
// Używa Spotify Web API + Web Playback SDK
// ============================================================

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  uri: string;
  duration_ms: number;
  is_playing: boolean;
}

export interface SpotifyState {
  is_connected: boolean;
  is_playing: boolean;
  current_track: SpotifyTrack | null;
  volume: number;
  progress_ms: number;
  device_id: string | null;
}

type SpotifyCallback = (state: SpotifyState) => void;

export class SpotifyService {
  private clientId: string;
  private redirectUri: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private deviceId: string | null = null;
  private player: any = null; // Spotify Web Playback SDK
  private stateCallbacks: SpotifyCallback[] = [];
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(clientId: string, redirectUri: string) {
    this.clientId = clientId;
    this.redirectUri = redirectUri;
  }

  // ---- Autoryzacja ----

  /** Generuj URL do autoryzacji Spotify */
  getAuthUrl(scopes: string[] = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'playlist-read-private',
    'playlist-read-collaborative',
  ]): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      show_dialog: 'true',
    });
    return `https://accounts.spotify.com/authorize?${params}`;
  }

  /** Wymień kod na token */
  async handleCallback(code: string): Promise<boolean> {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.redirectUri,
          client_id: this.clientId,
        }),
      });

      const data = await response.json();
      
      if (data.access_token) {
        this.accessToken = data.access_token;
        this.refreshToken = data.refresh_token;
        this.saveTokens();
        return true;
      }
      return false;
    } catch (err) {
      console.error('[Spotify] Błąd autoryzacji:', err);
      return false;
    }
  }

  /** Odśwież token */
  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
          client_id: this.clientId,
        }),
      });

      const data = await response.json();
      
      if (data.access_token) {
        this.accessToken = data.access_token;
        if (data.refresh_token) {
          this.refreshToken = data.refresh_token;
        }
        this.saveTokens();
        return true;
      }
      return false;
    } catch (err) {
      console.error('[Spotify] Błąd odświeżania tokenu:', err);
      return false;
    }
  }

  // ---- Inicjalizacja ----

  /** Załaduj zapisane tokeny */
  loadTokens(): boolean {
    try {
      const stored = localStorage.getItem('spotify-tokens');
      if (stored) {
        const { access, refresh } = JSON.parse(stored);
        this.accessToken = access;
        this.refreshToken = refresh;
        return true;
      }
    } catch (err) {
      console.error('[Spotify] Błąd ładowania tokenów:', err);
    }
    return false;
  }

  /** Zapisz tokeny */
  private saveTokens(): void {
    localStorage.setItem('spotify-tokens', JSON.stringify({
      access: this.accessToken,
      refresh: this.refreshToken,
    }));
  }

  /** Sprawdź czy jest zalogowany */
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // ---- Web Playback SDK (Desktop) ----

  /** Inicjalizuj Spotify Web Playback SDK */
  async initWebPlayback(): Promise<boolean> {
    if (!this.accessToken) return false;

    return new Promise((resolve) => {
      // Załaduj SDK
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.body.appendChild(script);

      (window as any).onSpotifyWebPlaybackSDKReady = () => {
        this.player = new (window as any).Spotify.Player({
          name: 'Lisi Player',
          getOAuthToken: (cb: (token: string) => void) => {
            cb(this.accessToken!);
          },
          volume: 0.5,
        });

        // Event listeners
        this.player.addListener('ready', ({ device_id }: { device_id: string }) => {
          console.log('[Spotify] Player gotowy, device_id:', device_id);
          this.deviceId = device_id;
          this.startPolling();
          resolve(true);
        });

        this.player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
          console.log('[Spotify] Player nie gotowy:', device_id);
        });

        this.player.addListener('player_state_changed', (state: any) => {
          if (state) {
            this.notifyCallbacks(this.mapState(state));
          }
        });

        this.player.connect();
      };
    });
  }

  // ---- Kontrola odtwarzania ----

  /** Odtwórz utwór po nazwie */
  async play(query?: string): Promise<string> {
    if (query) {
      // Szukaj utworu
      const results = await this.search(query);
      if (results.length > 0) {
        await this.playTrack(results[0].uri);
        return `Gram: ${results[0].name} - ${results[0].artist}`;
      }
      return `Nie znalazłam "${query}" na Spotify`;
    }

    // Wznów odtwarzanie
    await this.apiCall('PUT', '/me/player/play');
    return 'Wznawiam odtwarzanie~';
  }

  /** Odtwórz konkretny utwór */
  async playTrack(uri: string): Promise<void> {
    await this.apiCall('PUT', '/me/player/play', {
      uris: [uri],
    });
  }

  /** Pauza */
  async pause(): Promise<string> {
    await this.apiCall('PUT', '/me/player/pause');
    return 'Pauzuję muzykę~';
  }

  /** Następny utwór */
  async next(): Promise<string> {
    await this.apiCall('POST', '/me/player/next');
    return 'Następny utwór~';
  }

  /** Poprzedni utwór */
  async previous(): Promise<string> {
    await this.apiCall('POST', '/me/player/previous');
    return 'Poprzedni utwór~';
  }

  /** Ustaw głośność */
  async setVolume(percent: number): Promise<string> {
    const vol = Math.max(0, Math.min(100, percent));
    await this.apiCall('PUT', `/me/player/volume?volume_percent=${vol}`);
    return `Głośność: ${vol}%`;
  }

  /** Przewiń do pozycji */
  async seek(positionMs: number): Promise<void> {
    await this.apiCall('PUT', `/me/player/seek?position_ms=${positionMs}`);
  }

  /** Włącz/wyłącz shuffle */
  async shuffle(enabled: boolean): Promise<string> {
    await this.apiCall('PUT', `/me/player/shuffle?state=${enabled}`);
    return enabled ? 'Losowa kolejność włączona~' : 'Losowa kolejność wyłączona~';
  }

  /** Ustaw tryb powtarzania */
  async repeat(mode: 'track' | 'context' | 'off'): Promise<string> {
    await this.apiCall('PUT', `/me/player/repeat?state=${mode}`);
    switch (mode) {
      case 'track': return 'Powtarzam utwór~';
      case 'context': return 'Powtarzam playlistę~';
      case 'off': return 'Powtarzanie wyłączone~';
    }
  }

  // ---- Wyszukiwanie ----

  /** Szukaj utworów */
  async search(query: string, limit = 5): Promise<SpotifyTrack[]> {
    const params = new URLSearchParams({
      q: query,
      type: 'track',
      limit: limit.toString(),
      market: 'PL',
    });

    const data = await this.apiCall('GET', `/search?${params}`);
    
    if (!data?.tracks?.items) return [];

    return data.tracks.items.map((track: any) => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map((a: any) => a.name).join(', '),
      album: track.album.name,
      albumArt: track.album.images[0]?.url || '',
      uri: track.uri,
      duration_ms: track.duration_ms,
      is_playing: false,
    }));
  }

  /** Pobierz aktualnie odtwarzany utwór */
  async getCurrentTrack(): Promise<SpotifyTrack | null> {
    const data = await this.apiCall('GET', '/me/player/currently-playing');
    
    if (!data?.item) return null;

    return {
      id: data.item.id,
      name: data.item.name,
      artist: data.item.artists.map((a: any) => a.name).join(', '),
      album: data.item.album.name,
      albumArt: data.item.album.images[0]?.url || '',
      uri: data.item.uri,
      duration_ms: data.item.duration_ms,
      is_playing: data.is_playing,
    };
  }

  /** Pobierz playlisty użytkownika */
  async getPlaylists(): Promise<Array<{ id: string; name: string; trackCount: number }>> {
    const data = await this.apiCall('GET', '/me/playlists?limit=20');
    
    if (!data?.items) return [];

    return data.items.map((pl: any) => ({
      id: pl.id,
      name: pl.name,
      trackCount: pl.tracks.total,
    }));
  }

  /** Odtwórz playlistę */
  async playPlaylist(playlistId: string): Promise<string> {
    await this.apiCall('PUT', '/me/player/play', {
      context_uri: `spotify:playlist:${playlistId}`,
    });
    return 'Gram playlistę~';
  }

  // ---- Stan ----

  /** Pobierz aktualny stan */
  async getState(): Promise<SpotifyState> {
    const data = await this.apiCall('GET', '/me/player');
    
    if (!data) {
      return {
        is_connected: false,
        is_playing: false,
        current_track: null,
        volume: 0,
        progress_ms: 0,
        device_id: null,
      };
    }

    return {
      is_connected: true,
      is_playing: data.is_playing || false,
      current_track: data.item ? {
        id: data.item.id,
        name: data.item.name,
        artist: data.item.artists.map((a: any) => a.name).join(', '),
        album: data.item.album.name,
        albumArt: data.item.album.images[0]?.url || '',
        uri: data.item.uri,
        duration_ms: data.item.duration_ms,
        is_playing: data.is_playing,
      } : null,
      volume: data.device?.volume_percent || 0,
      progress_ms: data.progress_ms || 0,
      device_id: data.device?.id || null,
    };
  }

  /** Nasłuchuj zmian stanu */
  onStateChange(callback: SpotifyCallback): () => void {
    this.stateCallbacks.push(callback);
    return () => {
      this.stateCallbacks = this.stateCallbacks.filter((cb) => cb !== callback);
    };
  }

  // ---- Polling ----

  private startPolling(): void {
    if (this.pollInterval) return;
    
    this.pollInterval = setInterval(async () => {
      try {
        const state = await this.getState();
        this.notifyCallbacks(state);
      } catch (err) {
        // Ignoruj błędy pollingu
      }
    }, 5000); // Co 5 sekund
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // ---- Pomocnicze ----

  private async apiCall(method: string, endpoint: string, body?: any): Promise<any> {
    if (!this.accessToken) {
      // Spróbuj odświeżyć token
      if (this.refreshToken) {
        await this.refreshAccessToken();
      }
      if (!this.accessToken) return null;
    }

    try {
      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`https://api.spotify.com/v1${endpoint}`, options);

      if (response.status === 401) {
        // Token wygasł - odśwież
        await this.refreshAccessToken();
        return this.apiCall(method, endpoint, body);
      }

      if (response.status === 204) return null;
      if (!response.ok) return null;

      return await response.json();
    } catch (err) {
      console.error('[Spotify] Błąd API:', err);
      return null;
    }
  }

  private mapState(spotifyState: any): SpotifyState {
    return {
      is_connected: true,
      is_playing: spotifyState.paused === false,
      current_track: spotifyState.track_window?.current_track ? {
        id: spotifyState.track_window.current_track.id,
        name: spotifyState.track_window.current_track.name,
        artist: spotifyState.track_window.current_track.artists.map((a: any) => a.name).join(', '),
        album: spotifyState.track_window.current_track.album.name,
        albumArt: spotifyState.track_window.current_track.album.images[0]?.url || '',
        uri: spotifyState.track_window.current_track.uri,
        duration_ms: spotifyState.track_window.current_track.duration_ms,
        is_playing: spotifyState.paused === false,
      } : null,
      volume: 50,
      progress_ms: spotifyState.position || 0,
      device_id: this.deviceId,
    };
  }

  private notifyCallbacks(state: SpotifyState): void {
    for (const cb of this.stateCallbacks) {
      try {
        cb(state);
      } catch (err) {
        console.error('[Spotify] Błąd callback:', err);
      }
    }
  }

  // ---- Cleanup ----

  disconnect(): void {
    this.stopPolling();
    if (this.player) {
      this.player.disconnect();
      this.player = null;
    }
  }
}
