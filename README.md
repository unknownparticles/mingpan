# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## AI 解读配置

本项目的 AI 接入方式参考 [one_min_ceo](https://github.com/)：客户端直连 OpenAI 兼容 Chat Completions API，默认推荐 **SiliconFlow（硅基流动）**。

### 方式一：设置页填写

打开应用「设」，选择厂商（SiliconFlow / DeepSeek / MiniMax / 智谱 / 通义 / OpenAI / Ollama / 自定义），填写 Base URL、API Key、Model 后测试连接并保存。

### 方式二：环境变量

复制 `.env.example` 为 `.env.local`：

```bash
VITE_SILICONFLOW_API_KEY="你的 SiliconFlow API Key"
VITE_SILICONFLOW_MODEL="Qwen/Qwen2.5-14B-Instruct"
```

### 方式三：runtime-config.js

`public/runtime-config.js` 可在部署时写入：

```js
window.__MINGPAN_CONFIG__ = {
  provider: 'siliconflow',
  siliconFlowApiKey: '',
  siliconFlowModel: 'Qwen/Qwen2.5-14B-Instruct',
  enableThinking: false
};
```

注意：静态站点部署时密钥会对页面访问者可见，建议使用短期、低额度 Key，或改为后端代理。



## 平台 AI（CF AI）

接入 [ai.alunapi.top](https://ai.alunapi.top)（源码见登录仓库 `ai/` 模块）：

- **已登录**：默认开启 AI，优先调用平台 AI（`ai.alunapi.top` 的服务端 Key/额度）
- **平台失败**：提示到设置填写「自备 API Key」；若本地已有 Key 则自动回退直连
- **未登录**：必须在设置页填写自备 API Key 后才可启用 AI

```bash
VITE_AI_SERVICE_BASE_URL=https://ai.alunapi.top
```

## 账号登录（CF Auth）

接入独立登录服务 [login.alunapi.top](https://login.alunapi.top) / [register.alunapi.top](https://register.alunapi.top)。

- 设置页「账号」支持密码登录/注册、OAuth 跳转、会员等级与积分展示
- 跨域（如 GitHub Pages）使用 `localStorage` 中的 Bearer Token，不依赖 Cookie
- OAuth / 外站登录回跳通过 URL hash：`#cf_auth_token=...`（应用启动时自动消费）

环境变量 / runtime-config：

```bash
VITE_AUTH_BASE_URL=https://login.alunapi.top
VITE_LOGIN_BASE_URL=https://login.alunapi.top
VITE_REGISTER_BASE_URL=https://register.alunapi.top
```

```js
window.__MINGPAN_CONFIG__ = {
  authBaseUrl: 'https://login.alunapi.top',
  loginBaseUrl: 'https://login.alunapi.top',
  registerBaseUrl: 'https://register.alunapi.top',
  // ...AI 配置
};
```

## GitHub Pages 发布

仓库已配置 GitHub Actions：`.github/workflows/pages.yml`。

1. 在仓库 **Settings → Pages** 中将 Source 设为 **GitHub Actions**。
2. 在 **Settings → Secrets and variables → Actions** 新增 secret：

   ```text
   SILICONFLOW_API_KEY
   ```

   可选变量 `SILICONFLOW_MODEL`（默认 `Qwen/Qwen2.5-14B-Instruct`）。

3. 推送到 `master`/`main`，或手动运行工作流 **发布 GitHub Pages**。
4. 默认访问地址：

   ```text
   https://unknownparticles.github.io/mingpan/
   ```

构建时会把 secret 写入 `public/runtime-config.js`。静态托管下密钥对访问者可见，建议使用短期、低额度 Key。


## 紫微排盘引擎

引入 [Renhuai123/ziwei-doushu](https://github.com/Renhuai123/ziwei-doushu) 的 MIT 排盘核心及校正表，源码固定版本与本地适配说明见 [引擎来源](src/vendor/ziwei-doushu/README.md)。无需访问外部服务即可离线排盘。

- 三合派默认采用全书亮度表、农历正月初一换年、闰月前后半月分界。
- 中州派采用 iztro 中州算法及上游中州亮度表。
- 天纪派采用上游闰月归下月口径；原先仅有名称、无实际算法的飞星派选项已移除。
- 农历输入先转公历；出生地经度校正后重新计算日期与时辰。三合/中州晚子时按次日排盘，天纪晚子时按当日排盘。
- 紫微十二宫和人生曲线共用引擎，四化同时覆盖主星与辅星。

运行验证：`npm test`、`npm run build`、`npm run lint`。

### 时间校正、学习与分享

- 出生表单支持当地钟表小时/分钟、标准时区、手动夏令时减一小时与撤销；真太阳时包含经度差和 NOAA 均时差近似，并显示校正后的日期与时辰。夏令时提示沿用上游参考日期表，不代表自动判定出生地实际制度。
- 排盘规则可独立设置闰月、晚子时与亮度表。预设修改会重置这些规则；规则保存到本机，新建历史记录携带当时的规则。已有记录未携带规则时采用默认三合口径。
- 农历流年按农历出生年计算虚岁，大限起限前显示独立童限；人生曲线按实际起限年龄划分。流月查询以所选公历月十五日为代表。
- 紫微盘下方的「命盘研习」提供条件式格局识别、成立/助力/破格因素、星曜详情，以及三部公版古籍选录的浏览与检索，均可离线使用。
- 「保存与分享命盘」生成本地 PNG 或可复现的链接。链接包含出生参数、经度、时间校正与规则，不含姓名、城市名称、账户或 API 凭据；参数位于 URL hash。
- 分享链接首次打开会载入命盘但不自动新增历史记录；自定义规则会应用到当前本机排盘。
