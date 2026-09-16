// 文字来自用户维护的 Word 主稿；用 scripts/import-copy.py 同步。
import wordCopy from './word-copy.json' with { type: 'json' };

const eventImages = {
  "birth": [
    "portrait",
    "portrait-early",
    "officers-1921"
  ],
  "baoding": [
    "portrait-early",
    "officers-1921"
  ],
  "guangzhou-early": [
    "officers-1921",
    "portrait-early"
  ],
  "moscow-study": [
    "portrait-early",
    "officers-1921"
  ],
  "zhaoqing": [
    "yuejiang-tower",
    "officers-1921",
    "portrait-early"
  ],
  "xianning": [
    "northern-expedition-art",
    "portrait-early",
    "yuejiang-tower"
  ],
  "wuchang": [
    "portrait-early",
    "yuejiang-tower"
  ],
  "nanchang-uprising": [
    "nanchang-art",
    "veterans-1940",
    "portrait-early"
  ],
  "guangzhou-uprising": [
    "portrait-early",
    "officers-1921"
  ],
  "moscow-1928": [
    "portrait-early",
    "family-1939"
  ],
  "europe": [
    "europe-study-art",
    "family-1939",
    "family-garden-1939"
  ],
  "macau-return": [
    "family-garden-1939",
    "family-1939",
    "macau-house"
  ],
  "shanghai-return": [
    "family-1939",
    "snow-1938"
  ],
  "yanan": [
    "yanan-pagoda",
    "yangjialing",
    "uniform"
  ],
  "wuhan-headquarters": [
    "snow-1938",
    "uniform",
    "headquarters-1939"
  ],
  "yansi": [
    "headquarters-1939",
    "veterans-1940",
    "yunling-site"
  ],
  "jingxian": [
    "veterans-1940",
    "yunling-site",
    "uniform"
  ],
  "prison": [
    "prison-poem-art",
    "uniform",
    "family-1939"
  ],
  "rejoin": [
    "uniform",
    "family-1939"
  ],
  "heichashan": [
    "uniform",
    "family-1939",
    "headquarters-1939"
  ]
};

export const stories = Object.fromEntries(Object.entries(wordCopy.events).map(([id, copy]) => [id, { ...copy, images: eventImages[id] }]));
