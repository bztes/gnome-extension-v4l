install:
	mkdir -p ~/.local/share/gnome-shell/extensions/v4l@bztes.dev && cp ./* ~/.local/share/gnome-shell/extensions/v4l@bztes.dev/

dev:
	dbus-run-session -- gnome-shell --nested --wayland