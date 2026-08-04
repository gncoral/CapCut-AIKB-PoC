# CapCut M&UG Design Library

剪映 CapCut 商业化与增长设计团队的 AI 品牌视觉知识库公开试验版。

- 保留旧网站的页面框架，但不携带旧图库、搜狗品牌资料或品牌建议。
- 首轮仅发布已确认可公开的 37 张“模型上新背景”。
- 不包含旧 Git 历史、旧密钥或浏览器直写 GitHub 的逻辑。
- 新增分类：`模型上新背景`。
- Figma 文件：`HjEFKtMBDJm6Eessye8GjP`。
- Figma 页面节点：`0:1`。
- GitHub Actions 定时检查 Figma，新图会自动加入分类并重新发布网站。
- Figma 令牌只保存在 GitHub Actions Secret，不进入网页或仓库。

## 数据进入规则

同步脚本读取指定页面中的可导出顶层图层。若顶层是 Section，会读取 Section 内的直接子图层。支持 Frame、Component、Instance、Group、Rectangle 和 Slice。

每张图使用稳定 ID：

`figma:<file-key>:<node-id>`

重复同步会更新标题、图片和 Figma 链接，不会重复新增。Figma 中暂时删除的图不会自动删除本地历史记录，避免误删；正式版再加入“撤回”状态。

## Figma 自动同步

自动同步需要一个具备 `file_content:read` 权限的 Figma 访问令牌：

1. 在仓库 Settings → Secrets and variables → Actions 中创建 Secret。
2. Secret 名称必须是 `FIGMA_ACCESS_TOKEN`。
3. 工作流每 30 分钟检查一次，也可以在 Actions 页面手动运行。

本地开发仍可复制 `.env.example` 为 `.env.local`；`.env.local` 已被忽略，禁止上传。
