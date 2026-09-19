import { Row, Col, Slider, Radio, type RadioChangeEvent } from "antd";
import { useState, type CSSProperties } from "react";
import { ChineseConversion } from "../dandanplay";

const fontStyles: CSSProperties = {
  fontWeight: 400,
  fontSize: "12px",
  color: "hsla(0,0%,100%,.8)",
};

const railStyle: CSSProperties = {
  backgroundColor: "hsla(0,0%,100%,.2)",
};

const modalStyle: CSSProperties = {
  position: "absolute",
  left: "620px",
  bottom: "80px",
  width: "280px",
  zIndex: 1001,
  backgroundColor: "hsla(0,0%,8%,.9)",
};

export interface SettingsProps {
  fontSize: number;
  onFontSizeChange: (value: number) => void;
  opacity: number;
  onOpacityChange: (value: number) => void;
  conversion: ChineseConversion;
  onConversionChange: (value: ChineseConversion) => void;
}

interface SettingsPanelProps extends SettingsProps {
  visible: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export default function SettingsPanel({
  fontSize,
  onFontSizeChange,
  opacity,
  onOpacityChange,
  conversion,
  onConversionChange,
  visible,
  ...rest
}: SettingsPanelProps) {
  const [draftFontSize, setDraftFontSize] = useState(fontSize);
  const [draftOpacity, setDraftOpacity] = useState(opacity);

  const onRadioChange = (e: RadioChangeEvent) => {
    const value: unknown = e.target.value;
    if (
      value === ChineseConversion.None ||
      value === ChineseConversion.Simplified ||
      value === ChineseConversion.Traditional
    ) {
      onConversionChange(value);
    }
  };

  const style: CSSProperties = {
    ...modalStyle,
    display: visible ? "block" : "none",
  };

  return (
    <div style={style} {...rest}>
      <Row
        style={{ width: "100%", height: "35px" }}
        align="middle"
        justify="space-evenly"
      >
        <Col span={6} style={fontStyles}>
          简繁转换
        </Col>
        <Col span={16}>
          <Radio.Group onChange={onRadioChange} value={conversion}>
            <Radio style={fontStyles} value={ChineseConversion.None}>
              不转换
            </Radio>
            <Radio style={fontStyles} value={ChineseConversion.Simplified}>
              简
            </Radio>
            <Radio style={fontStyles} value={ChineseConversion.Traditional}>
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
        <Col span={6} style={fontStyles}>
          不透明度
        </Col>
        <Col span={12}>
          <Slider
            styles={{ rail: railStyle }}
            ariaLabelForHandle="不透明度"
            min={1}
            max={100}
            value={draftOpacity}
            onChange={setDraftOpacity}
            onChangeComplete={onOpacityChange}
          />
        </Col>
        <Col span={3} style={{ ...fontStyles, textAlign: "right" }}>
          {draftOpacity}%
        </Col>
      </Row>
      <Row
        style={{ width: "100%", height: "35px" }}
        align="middle"
        justify="space-evenly"
      >
        <Col span={6} style={fontStyles}>
          弹幕字号
        </Col>
        <Col span={12}>
          <Slider
            styles={{ rail: railStyle }}
            ariaLabelForHandle="弹幕字号"
            min={1}
            max={100}
            value={draftFontSize}
            onChange={setDraftFontSize}
            onChangeComplete={onFontSizeChange}
          />
        </Col>
        <Col span={3} style={{ ...fontStyles, textAlign: "right" }}>
          {draftFontSize}
        </Col>
      </Row>
    </div>
  );
}
