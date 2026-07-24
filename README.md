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

