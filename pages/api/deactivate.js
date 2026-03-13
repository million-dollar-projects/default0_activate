// POST /api/deactivate
// Body: { "code": "BETA-XXXX-XXXX-XXXX", "deviceId": "硬件UUID" }
//
// 状态码:
//   DEACTIVATED     — 停用成功
//   INVALID_CODE    — 激活码不存在
//   DEVICE_MISMATCH — 该激活码不属于这台设备（防止他人恶意停用）
//   MISSING_PARAMS  — 缺少参数

import { getTenantToken, findLicenseRecord } from "../../lib/feishu";

const FEISHU_BASE = "https://open.feishu.cn/open-apis";
const APP_TOKEN   = process.env.FEISHU_APP_TOKEN;
const TABLE_ID    = process.env.FEISHU_TABLE_ID;

async function deactivateRecord(token, recordId) {
  const res = await fetch(
    `${FEISHU_BASE}/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/${recordId}`,
    {
      method:  "PUT",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          "是否已使用": "否",
          "设备ID":     "",
          "激活时间":   "",
        },
      }),
    }
  );
  const data = await res.json();
  if (data.code !== 0) throw new Error(`更新记录失败: ${data.msg}`);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, code: "METHOD_NOT_ALLOWED", message: "仅支持 POST" });
  }

  const { code, deviceId } = req.body ?? {};
  if (!code || !deviceId) {
    return res.status(400).json({ success: false, code: "MISSING_PARAMS", message: "缺少 code 或 deviceId" });
  }

  const licenseCode = String(code).trim().toUpperCase();
  const device      = String(deviceId).trim();

  try {
    const token  = await getTenantToken();
    const record = await findLicenseRecord(token, licenseCode);

    // 激活码不存在
    if (!record) {
      return res.status(200).json({ success: false, code: "INVALID_CODE", message: "激活码无效" });
    }

    // 不是这台设备的激活码，拒绝停用（防止恶意操作）
    if (record.deviceId && record.deviceId !== device) {
      return res.status(200).json({ success: false, code: "DEVICE_MISMATCH", message: "该激活码未在此设备激活" });
    }

    // 清空绑定
    await deactivateRecord(token, record.recordId);

    return res.status(200).json({ success: true, code: "DEACTIVATED", message: "已停用，可在其他设备重新激活" });

  } catch (err) {
    console.error("[deactivate]", err);
    return res.status(500).json({ success: false, code: "SERVER_ERROR", message: "服务器错误" });
  }
}