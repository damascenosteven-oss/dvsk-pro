# 分组动作约束
issue: https://github.com/damascenosteven-oss/dvsk-pro/issues/11
status: accepted
base: 71892c9ec34f0a716ceb9ec90b078304b25f44be
adr: docs/adr/0018-strict-scenes.md

所有者批准官方 DeepSeek Flash 分组调用使用严格 submit_scenes；大纲、兼容地址维持原协议。共享枚举并保留完整应用校验和脱敏诊断。一次请求，错误不重试，草稿可续。测试覆盖两处真实失败位置、严格调用响应和兼容请求。CI 通过由所有者合并。上线后原身份和配置核对通过才请求首组一次，刷新核对 10/30。
