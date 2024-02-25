# fund-folio-fetch

## Overview

fund-folio-fetch is a monorepo of simple node.js applications, collecting data (currently fact sheets only) of investment funds and exchange traded funds (ETFs) from given websites.

Currently it can process:

- any ETFs that can be found on justetf.com
- hungarian investment funds, found on erstemarket.hu

## Getting Started

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/adamkui/fund-folio-fetch.git
   ```

2. Navigate to the project root:

   ```bash
   cd fund-folio-fetch
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Add .env files to sub-repos, to provide input for the applications. Currently this is done by providing ISIN numbers.

5. Start project:

   ```bash
   npm start
   ```
