# BOT-OTP-WA

Retrieve OTPs efficiently via WhatsApp automation.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)

## Overview

**Bot-Otp-Wa** is a cutting-edge WhatsApp bot that automates the retrieval of One-Time Passwords (OTPs) from Gmail, ensuring secure and efficient access to your accounts.

### Why Bot-Otp-Wa?

This project simplifies the OTP retrieval process, enhancing user experience and security. The core features include:

- **WhatsApp Integration:** Retrieve OTPs directly through WhatsApp for easy access.
- **Gmail API Authentication:** Securely fetch OTPs from Gmail while maintaining data privacy.
- **Real-Time Notifications:** Get timely updates on OTPs, ensuring you never miss an opportunity.
- **Time Zone Management:** Automatically adjust OTP retrieval based on your location.
- **User-Friendly Bot Interactions:** Fetch OTPs efficiently with intuitive commands.

## Getting Started

### Prerequisites

This project requires the following dependencies:

- **Programming Language:** JavaScript
- **Package Manager:** Npm

### Installation

Build Bot-Otp-Wa from the source and install dependencies:

1. Clone the repository:

```bash
    git clone https://github.com/your-repo.git
    cd Bot-Otp-Wa
```

2. Install dependencies:

```bash
    npm install
```

3. Configure environment variables:

```bash
    cp .env.example .env
    # Edit .env with your credentials
```

4. Set up WhatsApp connection:

```bash
    nodemon bot.js
    # Follow the prompts to connect your WhatsApp account
```

### Usage

Once installed, you can use the bot with these commands:

```
!otp - Fetch the latest OTP from your Gmail
```
