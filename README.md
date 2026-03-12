# License Server

macOS 应用激活码验证服务，基于飞书多维表格，部署在 Vercel。

## 飞书多维表格字段配置

需要以下 **5 列**（字段名必须完全一致）：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| 激活码 | 文本 | 主键 |
| 备注 | 文本 | 可选备注 |
| 是否已使用 | 单选（是/否，默认否） | 是否已激活 |
| 设备ID | 文本 | 绑定的硬件 UUID |
| 激活时间 | 文本 | 激活时间戳 |

---

## 本地运行

```bash
npm install
# 填写 .env.local（复制 .env.local 模板并填入真实值）
npm run dev
```

---

## 部署到 Vercel

1. 推到 GitHub 仓库
2. [vercel.com](https://vercel.com) → New Project → 导入仓库
3. **Settings → Environment Variables** 填入 4 个环境变量：
   - `FEISHU_APP_ID`
   - `FEISHU_APP_SECRET`
   - `FEISHU_APP_TOKEN`
   - `FEISHU_TABLE_ID`
4. Deploy

---

## API 文档

### POST /api/activate

**Request:**
```json
{
  "code": "BETA-A3F2-9KX1-PQ47",
  "deviceId": "A1B2C3D4-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
}
```

**Response:**
```json
{
  "success": true,
  "code": "ACTIVATED",
  "message": "激活成功"
}
```

**状态码说明：**

| code | success | 含义 |
|------|---------|------|
| `ACTIVATED` | true | 首次激活成功 |
| `ALREADY_ACTIVE` | true | 同设备重复激活（允许） |
| `INVALID_CODE` | false | 激活码不存在 |
| `USED_BY_OTHER` | false | 激活码已绑定其他设备 |
| `MISSING_PARAMS` | false | 缺少参数 |
| `SERVER_ERROR` | false | 服务器错误 |

---

## Swift 集成代码

```swift
import Foundation

// MARK: - 响应模型
struct ActivateResponse: Decodable {
    let success: Bool
    let code: String
    let message: String
}

// MARK: - 获取硬件 UUID
func getHardwareUUID() -> String? {
    let service = IOServiceGetMatchingService(
        kIOMainPortDefault,
        IOServiceMatching("IOPlatformExpertDevice")
    )
    defer { IOObjectRelease(service) }

    return IORegistryEntryCreateCFProperty(
        service,
        "IOPlatformUUID" as CFString,
        kCFAllocatorDefault, 0
    )?.takeRetainedValue() as? String
}

// MARK: - 激活方法
func activate(licenseCode: String) async -> Result<String, Error> {
    guard let deviceId = getHardwareUUID() else {
        return .failure(NSError(domain: "License", code: -1,
            userInfo: [NSLocalizedDescriptionKey: "无法获取设备 ID"]))
    }

    guard let url = URL(string: "https://your-app.vercel.app/api/activate") else {
        return .failure(NSError(domain: "License", code: -2,
            userInfo: [NSLocalizedDescriptionKey: "无效的服务地址"]))
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try? JSONSerialization.data(withJSONObject: [
        "code":     licenseCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased(),
        "deviceId": deviceId,
    ])

    do {
        let (data, _) = try await URLSession.shared.data(for: request)
        let result = try JSONDecoder().decode(ActivateResponse.self, from: data)

        if result.success {
            // 激活成功 → 存入 Keychain
            KeychainHelper.save(key: "licenseCode", value: licenseCode)
            return .success(result.message)
        } else {
            return .failure(NSError(domain: "License", code: -3,
                userInfo: [NSLocalizedDescriptionKey: result.message]))
        }
    } catch {
        return .failure(error)
    }
}

// MARK: - 调用示例
Task {
    let result = await activate(licenseCode: "BETA-A3F2-9KX1-PQ47")
    switch result {
    case .success(let msg): print("✅ \(msg)")
    case .failure(let err): print("❌ \(err.localizedDescription)")
    }
}
```
