/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Slider = imports.ui.slider;
const Debounce = Me.imports.debounce;
const v4lCtrl = Me.imports.v4lCtrl;

class Extension {
  constructor() {
    this._indicator = null;
  }

  enable() {
    this._addIndicator();
  }

  _addIndicator = () => {
    this._indicator = new IndicatorButton(this._updateMenu);

    let icon = new St.Icon({
      gicon: new Gio.ThemedIcon({ name: "camera-web-symbolic" }),
      style_class: "system-status-icon",
    });
    this._indicator.add_child(icon);

    Main.panel.addToStatusArea(Me.metadata.uuid, this._indicator, 0, "right");
  };

  _updateMenu = () => {
    let devices = v4lCtrl.loadDevices();

    this._indicator.menu.removeAll();
    for (let device of devices) {
      let subItem = new PopupMenu.PopupSubMenuMenuItem(device.name);
      this._indicator.menu.addMenuItem(subItem);
      for (let ctrl of device.ctrls) {
        if (ctrl.type === "bool") {
          const actionItem = new PopupMenu.PopupSwitchMenuItem(
            ctrl.name,
            ctrl.props.value
          );
          actionItem.connect("toggled", (item) => {
            v4lCtrl.setCtrl(device, ctrl, item.state);
          });

          subItem.menu.addMenuItem(actionItem);
        } else {
          const sm = new SliderMenu(
            ctrl.name,
            (ctrl.props.value - ctrl.props.min) /
              (ctrl.props.max - ctrl.props.min)
          );
          sm.onSlide = Debounce.debounce((value) =>
            v4lCtrl.setCtrl(
              device,
              ctrl,
              ctrl.props.min +
                ctrl.props.step *
                  value *
                  ((ctrl.props.max - ctrl.props.min) / ctrl.props.step)
            )
          );

          subItem.menu.addMenuItem(sm.item);
        }
      }

      subItem.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      const resetMenuItem = new PopupMenu.PopupMenuItem("Load Defaults");
      resetMenuItem.connect("activate", () => v4lCtrl.resetCtrls(device));
      subItem.menu.addMenuItem(resetMenuItem);
    }
  };

  disable() {
    this._indicator.destroy();
    this._indicator = null;
  }
}

class SliderMenu {
  constructor(name, value) {
    this.item = new PopupMenu.PopupMenuItem(name);
    this._slider = new Slider.Slider(value);
    this.item.add_child(this._slider);

    this.onSlide = () => null;
    this._slider.connect("notify::value", () =>
      this.onSlide(this._slider.value)
    );
  }
}

var IndicatorButton = GObject.registerClass(
  class IndicatorButton extends PanelMenu.Button {
    _init(updateMenu) {
      this.updateMenu = updateMenu;
      super._init(null, Me.metadata.uuid, false);
    }

    vfunc_event(event) {
      if (
        event.type() == Clutter.EventType.TOUCH_BEGIN ||
        event.type() == Clutter.EventType.BUTTON_PRESS
      ) {
        this.updateMenu();
      }

      return super.vfunc_event(event);
    }
  }
);

function init() {
  return new Extension();
}
