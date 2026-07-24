// 部署时可在构建阶段写入密钥（勿将长期生产密钥提交到 git）
// 参考 one_min_ceo 的 public/runtime-config.js 方案
window.__MINGPAN_CONFIG__ = window.__MINGPAN_CONFIG__ || {
  provider: 'siliconflow',
  siliconFlowApiKey: '',
  siliconFlowModel: 'Qwen/Qwen2.5-14B-Instruct',
  enableThinking: false,
  authBaseUrl: 'https://login.alunapi.top',
  loginBaseUrl: 'https://login.alunapi.top',
  registerBaseUrl: 'https://register.alunapi.top'
};
