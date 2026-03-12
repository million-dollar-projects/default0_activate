// pages/api/activate.js
//
// POST /api/activate
// Body: { "code": "BETA-XXXX-XXXX-XXXX", "deviceId": "硬件UUID" }
//
// Response 结构:
// { "success": true/false, "code": "状态码", "message": "说明" }
//
// 状态码:
//   ACTIVATED        — 首次激活成功
//   ALREADY_ACTIVE   — 同一台设备重复激活（允许，视为成功）
//   INVALID_CODE     — 激活码不存在
//   USED_BY_OTHER    — 激活码已绑定其他设备
//   MISSING_PARAMS   — 缺少参数
//   SERVER_ERROR     — 服务器内部错误

import { getTenantToken, findLicenseRecord, activateRecord } from "../../lib/feishu";

export default async function handler(req, res) {
  // 只允许 POST
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, code: "METHOD_NOT_ALLOWED", message: "仅支持 POST 请求" });
  }

  const { code, deviceId } = req.body ?? {};

  // ── 参数校验 ──────────────────────────────────────────────────────────────
  if (!code || !deviceId) {
    return res.status(400).json({
      success: false,
      code:    "MISSING_PARAMS",
      message: "缺少参数: code 和 deviceId 均为必填",
    });
  }

  const licenseCode = String(code).trim().toUpperCase();
  const device      = String(deviceId).trim();

  if (!licenseCode || !device) {
    return res.status(400).json({
      success: false,
      code:    "MISSING_PARAMS",
      message: "code 和 deviceId 不能为空",
    });
  }

  // ── 核心激活逻辑 ──────────────────────────────────────────────────────────
  try {
    const token  = await getTenantToken();
    const record = await findLicenseRecord(token, licenseCode);

    // 1. 激活码不存在
    if (!record) {
      return res.status(200).json({
        success: false,
        code:    "INVALID_CODE",
        message: "激活码无效",
      });
    }

    // 2. 激活码已绑定设备
    if (record.used && record.deviceId) {
      // 2a. 同一台机器 → 允许（重装系统等场景）
      if (record.deviceId === device) {
        return res.status(200).json({
          success: true,
          code:    "ALREADY_ACTIVE",
          message: "已激活",
        });
      }

      // 2b. 其他设备 → 拒绝
      return res.status(200).json({
        success: false,
        code:    "USED_BY_OTHER",
        message: "该激活码已在其他设备上使用",
      });
    }

    // 3. 未使用 → 绑定此设备并标记
    await activateRecord(token, record.recordId, device);

    return res.status(200).json({
      success: true,
      code:    "ACTIVATED",
      message: "激活成功",
    });

  } catch (err) {
    console.error("[activate]", err);
    return res.status(500).json({
      success: false,
      code:    "SERVER_ERROR",
      message: "服务器错误，请稍后重试",
    });
  }
}
