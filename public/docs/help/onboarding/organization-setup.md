# Organization Setup

## Creating an Organization

After your first login, you'll be prompted to create an organization. Each organization is an isolated workspace.

## Organization Settings

- **Name & Slug** — Your org name and URL-friendly slug
- **Logo & Branding** — Displayed on documents and the portal
- **Business Details** — GST number, PAN, address for tax compliance
- **Data Residency** — Choose where your data is stored (US, EU, or India)

## Roles & Permissions

### Default Roles
- **Owner** — Full access, cannot be removed
- **Admin** — All operations except billing and ownership transfer
- **Member** — Read-only by default, assignable custom permissions

### Custom Roles
Admins can create custom roles in Settings → Users → Roles. Define granular permissions across 17 resource types and 4 action types (Create, Read, Update, Delete).

## Multi-Organization Support

Users can belong to multiple organizations. Use the org switcher in the top navigation to switch contexts. Each organization's data is completely isolated.

## Data Residency

Enterprise plans can configure data residency to comply with regulations:
- **US** — Data stored in AWS us-east-1
- **EU** — Data stored in AWS eu-west-1
- **India** — Data stored in AWS ap-south-1
