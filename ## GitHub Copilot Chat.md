## GitHub Copilot Chat

- Extension: 0.37.8 (prod)
- VS Code: 1.109.5 (072586267e68ece9a47aa43f8c108e0dcbf44622)
- OS: win32 10.0.26200 x64
- GitHub Account: ZaryaA101

## Network

User Settings:
```json
  "http.systemCertificatesNode": true,
  "github.copilot.advanced.debug.useElectronFetcher": true,
  "github.copilot.advanced.debug.useNodeFetcher": false,
  "github.copilot.advanced.debug.useNodeFetchFetcher": true
```

Connecting to https://api.github.com:
- DNS ipv4 Lookup: 140.82.113.6 (16 ms)
- DNS ipv6 Lookup: Error (6 ms): getaddrinfo ENOTFOUND api.github.com
- Proxy URL: None (1 ms)
- Electron fetch (configured): HTTP 200 (69 ms)
- Node.js https: HTTP 200 (240 ms)
- Node.js fetch: HTTP 200 (219 ms)

Connecting to https://api.individual.githubcopilot.com/_ping:
- DNS ipv4 Lookup: 140.82.112.22 (4 ms)
- DNS ipv6 Lookup: Error (16 ms): getaddrinfo ENOTFOUND api.individual.githubcopilot.com
- Proxy URL: None (1 ms)
- Electron fetch (configured): HTTP 200 (219 ms)
- Node.js https: HTTP 200 (232 ms)
- Node.js fetch: HTTP 200 (232 ms)

Connecting to https://proxy.individual.githubcopilot.com/_ping:
- DNS ipv4 Lookup: 138.91.182.224 (8 ms)
- DNS ipv6 Lookup: Error (11 ms): getaddrinfo ENOTFOUND proxy.individual.githubcopilot.com
- Proxy URL: None (13 ms)
- Electron fetch (configured): HTTP 200 (15 ms)
- Node.js https: HTTP 200 (135 ms)
- Node.js fetch: HTTP 200 (72 ms)

Connecting to https://mobile.events.data.microsoft.com: HTTP 404 (157 ms)
Connecting to https://dc.services.visualstudio.com: HTTP 404 (200 ms)
Connecting to https://copilot-telemetry.githubusercontent.com/_ping: HTTP 200 (229 ms)
Connecting to https://telemetry.individual.githubcopilot.com/_ping: HTTP 200 (231 ms)
Connecting to https://default.exp-tas.com: HTTP 400 (126 ms)

Number of system certificates: 82

## Documentation

In corporate networks: [Troubleshooting firewall settings for GitHub Copilot](https://docs.github.com/en/copilot/troubleshooting-github-copilot/troubleshooting-firewall-settings-for-github-copilot).