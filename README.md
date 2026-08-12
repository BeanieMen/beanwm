# beanwm 

hi lol so basically i was literally losing my mind over standard window managers being super bloated and slow so i built **beanwm** at like 3 am on a high-caffeine hackathon streak with [Hack Club](https://hackclub.com)!! (yeah this lowkey slaps and i actually learned how display servers handle client windows) 🚀✨


---

## how to run this masterpiece

first, pull the repo and grab the packages:
```bash
git pull https://github.com/beaniemen/beanwm/
cd beanwm
bun install
```

then launch Xephyr in another terminal tab:
```bash
Xephyr -br -ac -noreset -screen 1280x720 :2
```

now run beanwm:
```bash
DISPLAY=:2 bun run dev
```

---

## hotkeys

- `Alt + Return` ➔ spawn a super fast terminal (`xterm`) 
- `Alt + 1..9` ➔ switch workspaces instantly 
- `Alt + Shift + 1..9` ➔ yeet active window to another workspace 
- `Alt + Shift + Q` ➔ close active window

---

## under the hood

`beanwm` hooks directly into the X11 root window event mask. When any X11 client app requests to display itself, `beanwm` intercepts `MapRequest` before the window is rendered on screen.
this is just a simple app interoping with the x11 display server ig
## 💻 tech stack

- **Runtime**: Bun 
- **Language**: TypeScript
- **Protocol**: Native X11 client IPC bindings via `@berstend/node-x11-typescript`

built with <3 by a dumbass developer