import { Row, Col, Slider, Radio, type RadioChangeEvent } from "antd";
import { useState } from "react";
import { DDPChConvert } from "../dandanplay";

const fontStyles: React.CSSProperties = {
  fontWeight: 400,
  fontSize: "12px",
  color: "hsla(0,0%,100%,.8)",
};

const railStyle: React.CSSProperties = {
  backgroundColor: "hsla(0,0%,100%,.2)",
};

const modalStyle: React.CSSProperties = {
  position: "absolute",
  left: "620px",
  bottom: "80px",
  width: "280px",
  zIndex: 1001,
  backgroundColor: "hsla(0,0%,8%,.9)",
};

export interface DMModalPropsInternal {
  fontSize: number;
  setFontSize: (_: number) => void;
  opacity: number;
  setOpacity: (_: number) => void;
  ch: DDPChConvert;
  setCh: (_: DDPChConvert) => void;
}

export interface MouseEventProps {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export interface DMModalProps extends DMModalPropsInternal, MouseEventProps {
  show: boolean;
}

const DMModal = ({
  fontSize,
  setFontSize,
  opacity,
  setOpacity,
  ch,
  setCh,
  show,
  ...rest
}: DMModalProps) => {
  const [_fontSize, _setFontSize] = useState<number>(fontSize);
  const [_opacity, _setOpacity] = useState<number>(opacity);

  const onRadioChange = (e: RadioChangeEvent) => {
    setCh(e.target.value as DDPChConvert);
  };

  const style: React.CSSProperties = {
    ...modalStyle,
    display: show ? "block" : "none",
  };

  return (
    <div style={style} {...rest}>
      <Row
        style={{ width: "100%", height: "35px" }}
        align="middle"
        justify="space-evenly"
      >
        <Col span={6} style={{ ...fontStyles }}>
          简繁转换
        </Col>
        <Col span={16}>
          <Radio.Group onChange={onRadioChange} value={ch}>
            <Radio style={{ ...fontStyles }} value={DDPChConvert.None}>
              不转换
            </Radio>
            <Radio style={{ ...fontStyles }} value={DDPChConvert.Simplified}>
              简
            </Radio>
            <Radio style={{ ...fontStyles }} value={DDPChConvert.Traditional}>
              繁
            </Radio>
          </Radio.Group>
        </Col>
      </Row>
      <Row
        style={{ width: "100%", height: "35px" }}
        align="middle"
        justify="space-evenly"
      >
        <Col span={6} style={{ ...fontStyles }}>
          不透明度
        </Col>
        <Col span={12}>
          <Slider
            styles={{ rail: railStyle }}
            min={1}
            max={100}
            value={_opacity}
            onChange={_setOpacity}
            onChangeComplete={setOpacity}
          />
        </Col>
        <Col span={3} style={{ ...fontStyles, textAlign: "right" }}>
          {_opacity}%
        </Col>
      </Row>
      <Row
        style={{ width: "100%", height: "35px" }}
        align="middle"
        justify="space-evenly"
      >
        <Col span={6} style={{ ...fontStyles }}>
          弹幕字号
        </Col>
        <Col span={12}>
          <Slider
            styles={{ rail: railStyle }}
            min={1}
            max={100}
            value={_fontSize}
            onChange={_setFontSize}
            onChangeComplete={setFontSize}
          />
        </Col>
        <Col span={3} style={{ ...fontStyles, textAlign: "right" }}>
          {_fontSize}
        </Col>
      </Row>
    </div>
  );
};

export default DMModal;
