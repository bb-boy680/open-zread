/**
 * Repo Map Configuration Constants
 */

export const REPO_MAP_CONFIG = {
  // Token 预算
  default_token_budget: 2048,
  header_budget_ratio: 0.2,     // 20% 预留给头部信息

  // 签名截断
  max_signature_length: 80,

  // 优先级权重
  reference_weight: 10,         // 引用次数权重
  export_weight: 5,             // 导出数量权重
  depth_weight_base: 10,        // 深度权重基数

  // 核心模块阈值
  core_threshold: 3,            // 引用数 >= 3 为核心文件
  must_include_threshold: 5,    // 引用数 >= 5 必须包含

  // 格式化
  tree_indent: '│   ',          // 树状缩进
  file_prefix: '├── ',          // 文件前缀
  dir_prefix: '├── ',           // 目录前缀
  symbol_indent: '│       ',    // 符号缩进
};