export const toCHS = (num) => {
  let map = {
    "1": "一",
    "2": "二",
    "3": "三",
    "4": "四",
    "5": "五",
    "6": "六",
    "7": "七",
    "8": "八",
    "9": "九",
    "10": "十",
    "11": "十一",
    "12": "十二",
    "13": "十三",
    "14": "十四",
    "15": "十五",
    "16": "十六",
    "17": "十七",
    "18": "十八",
    "19": "十九",
    "20": "二十",
  };
  return map[num] || null;
}

export const waitForElement = (selector, callback) => {
  if (document.querySelector(selector)) {
    callback();
  } else {
    requestAnimationFrame(() => waitForElement(selector, callback));
  }
};