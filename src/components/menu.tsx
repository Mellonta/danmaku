import { createPortal } from "react-dom";
import DMSwitch from "./dmswitch";
import DMSetting from "./dmsetting";
import { useEffect, useState } from "react";
import { waitEl } from "../utils";
import DMModal, { type DMModalPropsInternal } from "./dmmodal";

const MENU_SELECTOR =
  "div[class='PlayerControls-buttonGroupCenter-LDbSmK PlayerControls-buttonGroup-L3xlI0 PlayerControls-balanceLeft-jE50ih']";
const EXTENDED_MENU_ID = "danmaku-extended-menu";

interface SwitchAndSettingProps {
  on: boolean;
  onSwitch: () => void;
}

interface MenuPropsInternal
  extends SwitchAndSettingProps,
    DMModalPropsInternal {}

export interface MenuProps extends MenuPropsInternal {
  minimized: boolean;
}

const Menu = ({ on, onSwitch, ...rest }: MenuPropsInternal) => {
  const [_showModal, _setShowModal] = useState<boolean>(false);
  const [_timer, _setTimer] = useState<number | null>(null);

  const mouseProps = {
    onMouseEnter: () => {
      if (_timer) {
        clearTimeout(_timer);
        _setTimer(null);
      }
      _setShowModal(true);
    },
    onMouseLeave: () => {
      _setTimer(
        setTimeout(() => {
          _setShowModal(false);
        }, 200),
      );
    },
  };

  return (
    <>
      <DMModal {...rest} {...mouseProps} show={_showModal} />
      <DMSwitch on={on} onClick={onSwitch} />
      <DMSetting on={on} {...mouseProps} />
    </>
  );
};

const DMMenu = ({ minimized, ...rest }: MenuProps) => {
  const [_menu, _setMenu] = useState<HTMLElement | null>(null);

  const addBar = (menu: Element) => {
    const extendedMenu = document.createElement("span");
    extendedMenu.id = EXTENDED_MENU_ID;
    extendedMenu.style.display = "flex";
    menu.appendChild(extendedMenu);
    _setMenu(extendedMenu);
  };

  const addBarIfNotExist = () => {
    if (document.getElementById(EXTENDED_MENU_ID)) {
      return;
    }
    const menu = document.querySelector(MENU_SELECTOR);
    if (!menu) {
      return;
    }
    addBar(menu);
  };

  useEffect(() => {
    void waitEl(MENU_SELECTOR).then(addBar);
  }, []);

  useEffect(() => {
    addBarIfNotExist();
  }, [minimized]);

  return <>{_menu && createPortal(<Menu {...rest} />, _menu)}</>;
};

export default DMMenu;
