INSTALL_DIR=~/.local/share/gnome-shell/extensions/v4l@bztes.dev

install:
	mkdir -p $(INSTALL_DIR)
	cp -r src/* $(INSTALL_DIR)

remove:
	rm -rf $(INSTALL_DIR)

upgrade: remove install

dev:
	dbus-run-session -- gnome-shell --nested --wayland