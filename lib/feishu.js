// lib/feishu.js
// 所有飞书 API 操作封装

const FEISHU_BASE = "https://open.feishu.cn/open-apis";
const APP_TOKEN   = process.env.FEISHU_APP_TOKEN;
const TABLE_ID    = process.env.FEISHU_TABLE_ID;

// ─── 获取 tenant_access_token ────────────────────────────────────────────────
export async function getTenantToken() {
  const res = await fetch(`${FEISHU_BASE}/auth/v3/tenant_access_token/internal`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      app_id:     process.env.FEISHU_APP_ID,
      app_secret: process.env.FEISHU_APP_SECRET,
    }),
  });

  const data = await res.json();
  if (data.code !== 0) throw new Error(`飞书授权失败: ${data.msg}`);
  return data.tenant_access_token;
}

// ─── 按激活码查询记录 ──────────────────────────────────────────────────────────
// 返回: { recordId, deviceId, used } | null
export async function findLicenseRecord(token, licenseCode) {
  const res = await fetch(
    `${FEISHU_BASE}/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/search`,
    {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: {
          conjunction: "and",
          conditions: [{
            field_name: "激活码",
            operator:   "is",
            value:      [licenseCode],
          }],
        },
      }),
    }
  );

  const data = await res.json();
  if (data.code !== 0) throw new Error(`查询失败: ${data.msg}`);

  const items = data.data?.items ?? [];
  if (items.length === 0) return null;

  const record   = items[0];
  const fields   = record.fields ?? {};
  const recordId = record.record_id;

  // 「是否已使用」是单选，结构为 [{ text: "否" }]
  const usedText = Array.isArray(fields["是否已使用"])
    ? fields["是否已使用"][0]?.text
    : fields["是否已使用"];

  // 「设备ID」是文本，结构为 [{ text: "xxx" }]
  const deviceId = Array.isArray(fields["设备ID"])
    ? fields["设备ID"][0]?.text ?? ""
    : fields["设备ID"] ?? "";

  return {
    recordId,
    deviceId: deviceId.trim(),
    used:     usedText === "是",
  };
}

// ─── 绑定设备 + 标记已使用 ─────────────────────────────────────────────────────
export async function activateRecord(token, recordId, deviceId) {
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
          "是否已使用": "是",
          "设备ID":     deviceId,
          "激活时间":   new Date().toISOString().replace("T", " ").slice(0, 19),
        },
      }),
    }
  );

  const data = await res.json();
  if (data.code !== 0) throw new Error(`更新记录失败: ${data.msg}`);
}
