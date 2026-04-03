# <img src="logo.png" width="80" align="right" /> OpenProject to Invoice Ninja Sync

A professional web application designed to automate the generation of invoices in **Invoice Ninja** by synchronizing time-tracking data from **OpenProject**.

## 🚀 Features

- **Multi-Step Wizard**: A streamlined interface to filter, analyze, and sync data.
- **Hierarchical Project Selection**: Smart project tree view with proper indentation and sorting.
- **Advanced Filtering**: Filter by project, date range, and specific users.
- **Task Enrichment**: Automatically fetches task subjects and descriptions from OpenProject for professional invoice line items.
- **Hierarchical Grouping**: Groups time entries by Work Package (task) while ensuring "Project-level" entries are not missed.
- **Real-time Progress**: Live sync status updates via WebSockets.
- **Persistent Settings**: Remembers your payment details and preferences using local storage.
- **Secure by Design**: JWT-based authentication and protected WebSocket handshakes.

## 🛠 Tech Stack

- **Backend**: FastAPI (Python 3.13), PyJWT, Requests.
- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons.
- **Infrastructure**: Docker & Docker Compose.

## 📋 Prerequisites

- Docker and Docker Compose installed.
- Access to an **OpenProject** instance (API Token required).
- Access to an **Invoice Ninja v5** instance (API Token required).

## ⚙️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/serjsv87/OpenProject-to-Invoice-Ninja-Sync.git
   cd OpenProject-to-Invoice-Ninja-Sync
   ```

2. **Configure Environment Variables**:
   Copy the example environment file and fill in your actual credentials:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` and set your URLs and API Tokens.*

3. **Deploy with Docker**:
   ```bash
   docker compose up -d --build
   ```

4. **Access the App**:
   The frontend will be available at the port specified in your `.env` (default: `5180`).

## 🔐 Security Note

- Ensure you change the `JWT_SECRET` in your `.env` file for production deployments.
- The app uses a system-wide admin user configured via `APP_LOGIN` and `APP_PASSWORD` in the environment file.

## ☕ Support the Project

If this tool has saved you time and made your billing process easier, I would be grateful for a "tea" (coffee) donation! 

**TRX20 Wallet (TRON/USDT):** 
`TEiipQCBAPjABUoGDmgzqDBbRRiRHChfY2`

## 📄 Open Source & Contributions

This project is open-source and I welcome any improvements, bug fixes, or suggestions! If you find it useful and want to help make it even better, feel free to submit a Pull Request or open an issue.

## 📄 License

Released under the [MIT License](LICENSE). 
This project is completely open-source. You are free to use, modify, and distribute it as you see fit. Contributions are highly encouraged!
