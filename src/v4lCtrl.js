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

const GLib = imports.gi.GLib;

function loadDevices() {
  const reDevices = /^(?:(.+) \(.+\):)|[ \t]+(\/dev\/.+)/gm;

  const [res, out] = GLib.spawn_command_line_sync("v4l2-ctl --list-devices");

  let name = "Unknown";
  let devices = [];
  for (let match of out.toString().matchAll(reDevices)) {
    if (match[1]) {
      name = match[1];
    } else if (match[2]) {
      const device = _loadDevice(name, match[2]);
      if (device.ctrls.length > 0) {
        devices.push(device);
      }
    }
  }

  return devices;
}

_loadDevice = (name, path) => {
  const reCtrls = /^\s*([^\s]+).+\(([a-z0-9]+)\)\s*: (.*)/gm;

  const [res, out] = GLib.spawn_command_line_sync(
    `v4l2-ctl -d ${path} --list-ctrls`
  );
  const ctrls = [];
  for (let match of out.toString().matchAll(reCtrls)) {
    const ctrl = _loadCtrl(match[1], match[2], match[3]);
    ctrls.push(ctrl);
  }

  ctrls.sort((a, b) => {
    if (a.type === "int" && b.type === "bool") {
      return -1;
    }

    if (a.type === "bool" && b.type === "int") {
      return 1;
    }

    if (a.name < b.name) {
      return -1;
    }

    if (a.name > b.name) {
      return 1;
    }

    return 0;
  });

  return { name, path, ctrls };
};

_loadCtrl = (id, type, rawProps) => {
  const reProps = /([^=\s]+)=([-0-9]+)/gm;

  const props = { step: 1 };
  for (let keyVal of rawProps.matchAll(reProps)) {
    const value = _parsePropValue(type, keyVal[2]);
    if (value !== null) {
      props[keyVal[1]] = value;
    }
  }

  if (
    type === "int" &&
    props.min === 0 &&
    props.max === 1 &&
    props.step === 1
  ) {
    type = "bool";
    for (const [key, val] of Object.entries(props)) {
      props[key] = Boolean(val);
    }
  }

  return { name: id.replaceAll("_", " "), id, type, props };
};

_parsePropValue = (type, val) => {
  switch (type) {
    case "int":
    case "menu":
      return Number(val);
    case "bool":
      return val != 0;
    default:
      return null;
  }
};

function setCtrl(device, ctrl, value) {
  if (typeof value == "boolean") {
    value = value ? 1 : 0;
  } else {
    value = Math.round(value);
  }

  const cmd = `v4l2-ctl -d ${device.path} --set-ctrl=${ctrl.id}=${value}`;
  console.log(cmd);
  GLib.spawn_command_line_sync(cmd);
}

function resetCtrl(device, ctrl) {
  setCtrl(device, ctrl, ctrl.props.default);
}

function resetCtrls(device) {
  for (const ctrl of device.ctrls) {
    resetCtrl(device, ctrl);
  }
}
