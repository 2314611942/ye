import { stories } from './stories.js';
import { references } from './references.js';
export const sources = references;

export const periods = [
  {
    id: 'awakening', number: '01', chapter: '第一篇章', tab: '1896—1927', years: '1896 — 1927', rangeLabel: '1896—1927年',
    title: '投身革命 · 铁军建功', short: '从求学报国到参与建军', theme: '革命与建军',
    description: '从求学报国、独立团建军到北伐与两次起义，见证叶挺早期的革命征程。',
    events: [
      { id: 'birth', date: '1896.09.10', year: 1896, city: '惠阳', location: '广东 · 惠阳周田村', coords: [114.437, 22.862], title: '生于南粤，志在家国', tag: '少年立志',
        intro: '一段波澜壮阔的征途，从南粤一个普通的客家村落开始。',
        source: 'guangdong', offset: [34, 21] },
      { id: 'baoding', date: '1916—1918', year: 1916, city: '保定', location: '河北 · 保定陆军军官学校', coords: [115.50, 38.87], title: '求学保定，探索救国之路', tag: '求学明志',
        intro: '以军事报国，在新思想中寻找时代的答案。',
        source: 'guangdong', offset: [15, -18] },
      { id: 'guangzhou-early', date: '1921—1922', year: 1921, city: '广州', location: '广东 · 广州', coords: [113.264, 23.129], title: '追随革命，守卫总统府', tag: '投身革命',
        intro: '从军报国，将青年的理想付诸行动。',
        source: 'guangdong', offset: [20, -31] },
      { id: 'moscow-study', date: '1924—1925', year: 1924, city: '莫斯科', location: '苏联 · 莫斯科（今俄罗斯）', coords: [37.617, 55.756], title: '远赴苏联，确立革命信仰', tag: '信仰之光',
        intro: '远行求索，让救国理想有了更加清晰的方向。',
        source: 'liaison', overseas: true, offset: [0, -22] },
      { id: 'zhaoqing', date: '1925.11', year: 1925, city: '肇庆', location: '广东 · 肇庆', coords: [112.465, 23.047], title: '独立团建军，铁军初铸', tag: '铁军初铸',
        intro: '一支以共产党员为骨干的革命队伍，在西江之畔集结。',
        source: 'guangdong', offset: [-29, 4] },
      { id: 'xianning', date: '1926.08', year: 1926, city: '咸宁', location: '湖北 · 汀泗桥、贺胜桥', coords: [114.26, 29.88], title: '浴血北伐，勇破两桥', tag: '北伐先锋',
        intro: '在汀泗桥、贺胜桥的激战中，打出攻坚克难的铁军风骨。',
        source: 'guangdong', offset: [-23, 13] },
      { id: 'wuchang', date: '1926.10', year: 1926, city: '武昌', location: '湖北 · 武汉武昌', coords: [114.306, 30.55], title: '攻克武昌，铁军威名远扬', tag: '北伐名将',
        intro: '从南粤到长江，铁军之名在战火中传扬。',
        source: 'liaison', offset: [24, -18] },
      { id: 'nanchang-uprising', date: '1927.08.01', year: 1927, city: '南昌', location: '江西 · 南昌', coords: [115.858, 28.683], title: '南昌起义，打响武装反抗第一枪', tag: '八一军魂',
        intro: '在革命的紧要关头，挺身而出，承担历史使命。',
        source: 'uprising', offset: [23, -20] },
      { id: 'guangzhou-uprising', date: '1927.12.11', year: 1927, city: '广州', location: '广东 · 广州', coords: [113.264, 23.129], title: '广州起义，再举革命旗帜', tag: '挺身而出',
        intro: '在严峻局势中，再一次站到斗争的前列。',
        source: 'liaison', offset: [-24, -30] },
    ],
  },
  {
    id: 'conviction', number: '02', chapter: '第二篇章', tab: '1928—1937.6', years: '1928 — 1937年上半年', rangeLabel: '1928—1937年上半年',
    title: '辗转求索 · 丹心不改', short: '从海外旅居到归国寻路', theme: '风雨与坚守',
    description: '从莫斯科、欧洲到澳门与上海，在人生曲折中继续学习，寻找报国之路。',
    events: [
      { id: 'moscow-1928', date: '1928', year: 1928, city: '莫斯科', location: '苏联 · 莫斯科（今俄罗斯）', coords: [37.617, 55.756], title: '辗转莫斯科，身处人生低谷', tag: '曲折求索',
        intro: '革命道路并非坦途，挫折也成为生命的一部分。',
        source: 'clean', overseas: true, offset: [12, -21] },
      { id: 'europe', date: '1928—1932', year: 1928, city: '柏林', location: '欧洲 · 柏林等地', coords: [13.405, 52.52], title: '旅居欧洲，困顿中继续求索', tag: '异国岁月',
        intro: '生活辗转艰辛，仍不放弃对军事知识的钻研。',
        source: 'macau', overseas: true, offset: [-14, -23] },
      { id: 'macau-return', date: '1932—1937', year: 1932, city: '澳门', location: '中国 · 澳门', coords: [113.544, 22.198], title: '归居澳门，心系民族危亡', tag: '丹心不改',
        intro: '身在澳门，心始终与祖国的命运相连。',
        source: 'liaison', offset: [-25, 23] },
      { id: 'shanghai-return', date: '1937年春', year: 1937, city: '上海', location: '中国 · 上海', coords: [121.474, 31.23], title: '赴沪寻路，准备投身抗战', tag: '再赴征程',
        intro: '走出暂居之地，再次奔向时代的洪流。',
        source: 'macau', offset: [24, -5] },
    ],
  },
  {
    id: 'immortal', number: '03', chapter: '第三篇章', tab: '1937.7—1946', years: '1937年下半年 — 1946', rangeLabel: '1937年下半年—1946年',
    title: '抗战烽火 · 浩气长存', short: '从抗战前线到不朽丰碑', theme: '抗战与忠诚',
    description: '重返抗日前线，历经五年囚禁，在生命的最后岁月中坚守理想与气节。',
    events: [
      { id: 'yanan', date: '1937.11', year: 1937, city: '延安', location: '陕西 · 延安', coords: [109.49, 36.59], title: '到访延安，重赴抗战征程', tag: '重赴征程',
        intro: '以新的担当，回应民族危亡中的召唤。',
        source: 'guangdong', offset: [-22, -18] },
      { id: 'wuhan-headquarters', date: '1937.12', year: 1937, city: '武汉', location: '湖北 · 武汉汉口', coords: [114.29, 30.59], title: '筹建新四军，军部在汉口成立', tag: '铁军新生',
        intro: '汇聚南方红军游击力量，开赴抗日前线。',
        source: 'army', offset: [-22, -14] },
      { id: 'yansi', date: '1938年春', year: 1938, city: '岩寺', location: '安徽 · 岩寺（今黄山市徽州区）', coords: [118.337, 29.828], title: '岩寺整训，挺进敌后', tag: '抗日救亡',
        intro: '从集中整训到奔赴战场，新四军在烽火中成长。',
        source: 'army', offset: [26, 20] },
      { id: 'jingxian', date: '1941.01', year: 1941, city: '泾县', location: '安徽 · 泾县茂林地区', coords: [118.08, 30.50], title: '皖南事变，身陷囹圄志不屈', tag: '临危不屈',
        intro: '在危难与重围之中，坚守军人的责任。',
        source: 'poetry', offset: [18, -21] },
      { id: 'prison', date: '1941—1946', year: 1941, city: '重庆', location: '重庆 · 囚禁岁月的代表地点', coords: [106.438, 29.566], title: '以诗明志，写下不屈的《囚歌》', tag: '铁骨铮铮',
        intro: '肉身可以被禁锢，精神却始终自由。',
        source: 'poetry', offset: [-17, -23] },
      { id: 'rejoin', date: '1946.03', year: 1946, city: '重庆', location: '重庆 · 获释与重新入党', coords: [106.546, 29.562], title: '重获自由，再次申请入党', tag: '初心如磐',
        intro: '历经磨难，依然选择将一切献给人民。',
        source: 'application', offset: [17, 21] },
      { id: 'heichashan', date: '1946.04.08', year: 1946, city: '兴县', location: '山西 · 兴县黑茶山', coords: [111.19, 38.46], title: '魂归黑茶山，精神永留人间', tag: '浩气长存',
        intro: '未竟的归途，化为后人永远的怀念。',
        source: 'memorial', offset: [23, -20] },
    ],
  },
];

for (const period of periods) {
  for (const event of period.events) {
    Object.assign(event, stories[event.id]);
    event.paragraphs = event.sections.map((section) => section.text);
  }
}

export const allEvents = periods.flatMap((period) => period.events);
export const getEvent = (id) => allEvents.find((event) => event.id === id);
export const getPeriod = (id) => periods.find((period) => period.events.some((event) => event.id === id));

export const overseasEvents = allEvents.filter((event) => event.overseas);
export const periodization = {
  text: '按叶挺个人经历划分：1896—1927年为求学、北伐及两次起义；1928—1937年上半年为旅居与归国求索；1937年下半年—1946年为全面抗战、囚禁与重获自由。1937年以7月全面抗战爆发为界。',
  refs: ['liaison', 'clean', 'headquarters'],
};
