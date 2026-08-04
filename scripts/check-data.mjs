import fs from 'node:fs/promises';

const images = JSON.parse(await fs.readFile(new URL('../data/images.json', import.meta.url), 'utf8'));
if (!Array.isArray(images)) throw new Error('images.json 必须是数组');

const ids = new Set();
for (const [index, image] of images.entries()) {
  for (const field of ['id', 'title', 'src', 'category']) {
    if (typeof image[field] !== 'string' || !image[field]) {
      throw new Error(`第 ${index + 1} 条缺少字符串字段 ${field}`);
    }
  }
  if (ids.has(image.id)) throw new Error(`重复 id: ${image.id}`);
  ids.add(image.id);
  if (image.tags !== undefined && !Array.isArray(image.tags)) {
    throw new Error(`第 ${index + 1} 条 tags 必须是数组`);
  }
}

const modelLaunchCount = images.filter(image => image.category === 'model-launch-background').length;
console.log(`数据检查通过：${images.length} 条，模型上新背景 ${modelLaunchCount} 条`);

