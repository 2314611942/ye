const commons = (file) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`;
const photo = (id, title, date, caption, file, overrides = {}) => ({ id, title, date, caption, src: `/images/archive/${id}.jpg`, thumb: `/images/archive/${id}-thumb.jpg`, type: '历史原照', author: '摄影者不详', source: 'Wikimedia Commons', url: commons(file), license: '公共领域 · PD-China', licenseUrl: commons(file), ...overrides });
const illustration = (id, title, caption) => ({
  id, title, date: '2026年创作', caption, type: 'AI 艺术示意',
  src: `/images/illustrations/${id}.webp`, thumb: `/images/illustrations/${id}-thumb.webp`,
  author: 'AI生成', source: '本项目艺术示意图', url: `/images/illustrations/${id}.webp`,
  license: '项目生成素材，非历史原照', licenseUrl: '/images/illustrations/'
});
export const media = {
  'northern-expedition-art': illustration('northern-expedition-art', '北伐征途 · 艺术示意', '以红旗、行军队伍与桥梁象征1926年北伐汀泗桥、贺胜桥战斗。AI生成绘画，非历史照片，不复原确切人物、桥梁形制或作战现场。'),
  'nanchang-art': illustration('nanchang-art', '八一起义 · 艺术示意', '以黎明、街巷和革命军人象征1927年南昌起义。AI生成绘画，非历史照片，人物及建筑均为艺术概括。'),
  'europe-study-art': illustration('europe-study-art', '旅欧求索 · 艺术示意', '以欧洲窗景、书籍与伏案背影表现旅居与学习。AI生成绘画，非叶挺肖像或真实居所复原，不据此认定具体生活细节。'),
  'prison-poem-art': illustration('prison-poem-art', '铁窗诗志 · 艺术示意', '以囚室、光束与纸页表达《囚歌》的精神意境。AI生成绘画，非历史照片、原稿或确切囚室复原。'),
  portrait: photo('portrait', '叶挺将军肖像', '1946年以前，具体年份未详', '叶挺军装肖像，作为展厅人物引介。', 'Ye Ting.jpg'),
  'officers-1921': photo('officers-1921', '第一师军官合影', '1921年', '摄于广州培苑公园餐厅。左起：齐公恪、张发奎、梁鸿楷、王超、叶挺、罗子良。', '1921年第一師軍官合影.jpg'),
  'snow-1938': photo('snow-1938', '叶挺与埃德加·斯诺', '1938年', '汉口，新四军军长叶挺与美国记者埃德加·斯诺合影。', '1938 Ye Snow.jpg'),
  'veterans-1940': photo('veterans-1940', '从南昌走来的新四军干部', '1940年（据文件页）', '皖南合影，前排左起：周子昆、袁国平、叶挺、陈毅、粟裕。为南昌起义参加者后来的合影，非起义现场。', 'New4suyu.jpg'),
  uniform: photo('uniform', '新四军军长叶挺', '1930年代（据文件页）', '叶挺身着国民革命军中将军服。', 'Ya Ting in NRA uniform.jpg'),
  'family-garden-1939': photo('family-garden-1939', '澳门庭院中的一家人', '1939年', '叶挺与家人在澳门合影；叶挺左一、叶正大左二。不是欧洲旅居时期照片。', "Ye's family in 1939 in Macau.jpg"),
  'portrait-early': photo('portrait-early', '叶挺人物照片', '不晚于1941年', '据《中国名人录》相关图像文件；拍摄日期未详。', 'Ye Ting2.jpg', { author: '摄影者不详；扫描：Wikimedia Commons 用户天竺鼠，2011年' }),
  'family-1939': photo('family-1939', '叶挺与家人在澳门', '1939年', '澳门家庭合影，呈现叶挺、李秀文和孩子们的生活。为回国后的家庭资料。', 'Ye Ting family 1939.jpg'),
  'headquarters-1939': photo('headquarters-1939', '周恩来、叶挺与项英', '1939年', '皖南新四军军部合影。为军部生活资料，非1937年延安访问或1938年岩寺整训现场。', 'Zhou Enlai and Ye Ting in 1939.jpg'),
  'macau-house': photo('macau-house', '澳门叶挺将军故居', '2023年8月8日', '澳门叶挺将军故居，贾伯乐提督街。今日纪念空间。', "General Ye Ting's Former Residence 08-08-2023(1).jpg", { type: '遗址今照', author: 'LN9267', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' }),
  'yuejiang-tower': photo('yuejiang-tower', '肇庆阅江楼', '2013年11月16日', '叶挺独立团团部旧址所在的阅江楼，作为肇庆建军阶段的地点资料。', 'Zhaoqing Yuejiang Lou 2013.11.16 12-21-01.jpg', { type: '遗址今照', author: 'Zhangzhugang', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' }),
  'yunling-site': photo('yunling-site', '云岭新四军军部旧址', '2017年8月20日', '安徽泾县云岭，军部司令部旧址种墨园。此处是云岭，非岩寺或茂林战场。', 'Jingxian Yunling 2017.08.20 11-21-37.jpg', { type: '遗址今照', author: 'Zhangzhugang', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' }),
  'yanan-pagoda': photo('yanan-pagoda', '延安宝塔山', '2025年11月', '延安宝塔山今照，作为延安地标资料。', '延安宝塔山.jpg', { type: '遗址今照', author: 'H2v5o68z', license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' }),
  yangjialing: photo('yangjialing', '杨家岭革命旧址', '2010年', '延安杨家岭中共中央办公厅旧址今照，非叶挺1937年到访现场。', '杨家岭中共中央办公厅旧址 Yang Jia Ling - panoramio.jpg', { type: '遗址今照', author: 'wanghongliu', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/' }),
};
