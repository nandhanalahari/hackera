"use strict";

/* Supabase Auth — sign in / sign up, optional for browsing, required for cloud sync. */

const Auth = {
  _client: null,
  _session: null,
  _user: null,
  _listeners: [],
  _mode: "signin",

  get client() {
    return this._client;
  },
  getUser() {
    return this._user;
  },
  getSession() {
    return this._session;
  },
  isLoggedIn() {
    return !!this._user;
  },
  getAccessToken() {
    return this._session?.access_token || null;
  },

  async init() {
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) {
      this._setSession(null);
      this._bindUi();
      return;
    }

    this._client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    const { data } = await this._client.auth.getSession();
    this._setSession(data.session || null);

    this._client.auth.onAuthStateChange((_event, session) => {
      this._setSession(session || null);
      if (session) this.hideModal();
    });

    this._bindUi();
  },

  onChange(fn) {
    this._listeners.push(fn);
    try {
      fn(this._user);
    } catch {
      /* ignore listener errors during init */
    }
  },

  async signUp(email, password, name) {
    if (!this._client) return { error: { message: "Auth is not configured. Add SUPABASE_URL and SUPABASE_KEY to config.js." } };
    return this._client.auth.signUp({
      email,
      password,
      options: { data: { display_name: name || email.split("@")[0] } }
    });
  },

  async signIn(email, password) {
    if (!this._client) return { error: { message: "Auth is not configured. Add SUPABASE_URL and SUPABASE_KEY to config.js." } };
    return this._client.auth.signInWithPassword({ email, password });
  },

  async signOut() {
    if (!this._client) return;
    await this._client.auth.signOut();
    this._setSession(null);
  },

  showModal(mode) {
    if (mode) this._setMode(mode);
    const overlay = document.getElementById("auth-overlay");
    if (!overlay) return;
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    const email = document.getElementById("auth-email");
    if (email) setTimeout(() => email.focus(), 50);
  },

  hideModal() {
    const overlay = document.getElementById("auth-overlay");
    if (!overlay) return;
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    const err = document.getElementById("auth-error");
    if (err) {
      err.textContent = "";
      err.classList.add("hidden");
    }
  },

  _setMode(mode) {
    this._mode = mode === "signup" ? "signup" : "signin";
    const nameField = document.getElementById("auth-name-field");
    const submit = document.getElementById("auth-submit");
    const toggleText = document.getElementById("auth-toggle-text");
    const toggleLink = document.getElementById("auth-toggle-link");
    const title = document.getElementById("auth-title");
    const sub = document.getElementById("auth-sub");

    const signup = this._mode === "signup";
    if (nameField) nameField.classList.toggle("hidden", !signup);
    if (submit) submit.textContent = signup ? "Create account" : "Sign in";
    if (title) title.textContent = signup ? "Create your account" : "Welcome back";
    if (sub) sub.textContent = signup ? "Save progress across devices and keep your prep personalized." : "Sign in to sync progress and pick up where you left off.";
    if (toggleText) toggleText.textContent = signup ? "Already have an account?" : "New here?";
    if (toggleLink) toggleLink.textContent = signup ? "Sign in" : "Create one";
  },

  _setSession(session) {
    this._session = session;
    const u = session?.user || null;
    this._user = u
      ? {
          id: u.id,
          email: u.email,
          name:
            u.user_metadata?.display_name ||
            u.user_metadata?.full_name ||
            (u.email ? u.email.split("@")[0] : "User")
        }
      : null;
    this._renderNav();
    this._listeners.forEach((fn) => {
      try {
        fn(this._user);
      } catch (err) {
        console.warn("[auth]", err);
      }
    });
  },

  _renderNav() {
    const signInBtn = document.getElementById("nav-signin");
    const menu = document.getElementById("user-menu");
    const nameEl = document.getElementById("user-name");
    const avatar = document.getElementById("user-avatar");
    const guest = !this._user;

    if (signInBtn) signInBtn.classList.toggle("hidden", !guest);
    if (menu) menu.classList.toggle("hidden", guest);
    if (!guest) {
      if (nameEl) nameEl.textContent = this._user.name;
      if (avatar) avatar.textContent = (this._user.name || "?").slice(0, 1).toUpperCase();
    }
  },

  _bindUi() {
    const overlay = document.getElementById("auth-overlay");
    const form = document.getElementById("auth-form");
    const toggle = document.getElementById("auth-toggle-link");
    const closeBtn = document.getElementById("auth-close");
    const signInBtn = document.getElementById("nav-signin");
    const signOutBtn = document.getElementById("nav-signout");

    this._setMode("signin");
    this._renderNav();

    document.querySelectorAll("[data-auth]").forEach((btn) => {
      btn.addEventListener("click", () => this.showModal(btn.getAttribute("data-auth")));
    });

    if (signInBtn) signInBtn.addEventListener("click", () => this.showModal("signin"));
    if (signOutBtn) signOutBtn.addEventListener("click", () => this.signOut());
    if (closeBtn) closeBtn.addEventListener("click", () => this.hideModal());
    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) this.hideModal();
      });
    }
    if (toggle) {
      toggle.addEventListener("click", (e) => {
        e.preventDefault();
        this._setMode(this._mode === "signin" ? "signup" : "signin");
      });
    }
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const err = document.getElementById("auth-error");
        const submit = document.getElementById("auth-submit");
        const email = document.getElementById("auth-email")?.value.trim();
        const password = document.getElementById("auth-password")?.value || "";
        const name = document.getElementById("auth-name")?.value.trim();
        if (err) {
          err.textContent = "";
          err.classList.add("hidden");
        }
        if (submit) submit.disabled = true;

        const result =
          this._mode === "signup" ? await this.signUp(email, password, name) : await this.signIn(email, password);

        if (submit) submit.disabled = false;
        if (result?.error) {
          if (err) {
            err.textContent = result.error.message;
            err.classList.remove("hidden");
          }
          return;
        }

        if (this._mode === "signup" && result?.data?.user && !result?.data?.session) {
          if (err) {
            err.textContent = "Account created. Check your email to confirm, then sign in.";
            err.classList.remove("hidden");
          }
          this._setMode("signin");
          return;
        }

        form.reset();
        this.hideModal();
        if (location.hash === "#/landing" || !location.hash) location.hash = "#/";
      });
    }
  }
};

window.Auth = Auth;
