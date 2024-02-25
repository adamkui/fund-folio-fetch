import { createModuleLogger } from '@fund-folio-fetch/logger';
import { asyncForEach } from '@fund-folio-fetch/utils';
import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import { once } from 'events';
import * as fs from 'fs';
import { homedir } from 'os';

dotenv.config();
const logger = createModuleLogger('ERSTE-MARKET-FETCH');

const ERSTE_MARKET_BASE_URL = 'https://www.erstemarket.hu';
const ERSTE_MARKET_PRODUCT_PAGE_URL_PART = 'befektetesi_alapok/alap';
const MONTHLY_REPORT_TITLE = 'Havi portfóliójelentés';
const FUND_ARR_BY_ISIN = process.env.FUND_ARR_BY_ISIN.split(',');
const FUND_ARRAY_LENGTH = FUND_ARR_BY_ISIN.length;
const TODAY = new Date();
const CURRENT_YEAR = TODAY.getFullYear();
const CURRENT_MONTH = TODAY.toLocaleString('default', { month: 'short' });
const FACT_SHEETS_FOLDER_PATH = `${homedir}/documents/fact-sheets`;
const ERSTE_MARKET_FUNDS_FOLDER_PATH = `${FACT_SHEETS_FOLDER_PATH}/erste-market-funds`;
const CURRENT_YEAR_FOLDER = `${ERSTE_MARKET_FUNDS_FOLDER_PATH}/${CURRENT_YEAR}`;
const CURRENT_MONTH_FOLDER = `${CURRENT_YEAR_FOLDER}/${CURRENT_MONTH}`;
const FOLDERS_TO_CHECK = [FACT_SHEETS_FOLDER_PATH, ERSTE_MARKET_FUNDS_FOLDER_PATH, CURRENT_YEAR_FOLDER, CURRENT_MONTH_FOLDER];

const capitalizeHeading = (heading: string) => heading.toLowerCase().replace(/(^\w{1})|(\s+\w{1})/g, (letter) => letter.toUpperCase());

(async () => {
  logger.info('erstemarket.hu fund collector started!');

  FOLDERS_TO_CHECK.forEach((folderPath) => {
    if (!fs.existsSync(folderPath)) {
      logger.info(`Creating folder: ${folderPath}`);
      fs.mkdirSync(folderPath);
    }
  });

  logger.info(`Found ${FUND_ARRAY_LENGTH} ETF to process: ${FUND_ARR_BY_ISIN}`);

  asyncForEach(FUND_ARR_BY_ISIN, async (fundByIsin, index) => {
    const loggerIndex = `${index + 1}/${FUND_ARRAY_LENGTH}`;
    const loggerProcessing = `Processing ${loggerIndex}`;
    const ersteMarketSearchUrl = `${ERSTE_MARKET_BASE_URL}/${ERSTE_MARKET_PRODUCT_PAGE_URL_PART}/${fundByIsin}`;

    logger.info(`${loggerProcessing}: ${fundByIsin} started`);

    try {
      logger.info(`${loggerProcessing}: gathering data from ${ersteMarketSearchUrl}`);

      const productWebsite = await axios.get(ersteMarketSearchUrl);
      const $ = cheerio.load(productWebsite.data);
      const documentTitle = capitalizeHeading($('h1#etf-title').text());
      const documentURL = $(`a:contains("${MONTHLY_REPORT_TITLE}")`).attr().href;
      const fullURL = `${ERSTE_MARKET_BASE_URL}${documentURL}`;

      logger.info(`${loggerProcessing}: found document title ${documentTitle} and document URL: ${documentURL}`);
      logger.info(`${loggerProcessing}: downloading document from ${documentURL}`);

      const filePath = `${CURRENT_MONTH_FOLDER}/${documentTitle}.pdf`;
      const fileStream = fs.createWriteStream(filePath);
      const downloadedDocument = await axios.get(fullURL, { responseType: 'stream' });

      downloadedDocument.data.pipe(fileStream);

      const finishPromise = once(fileStream, 'finish');

      await finishPromise.then(() => {
        fileStream.close();
        logger.info(`${loggerProcessing}: Document succesfully downloaded to: ${filePath}`);
        logger.info(`${loggerProcessing}: ${fundByIsin} finished`);
        return 1;
      });
    } catch (error) {
      logger.error(`An error has occured processing ${loggerIndex}, skipping document`, error);
    } finally {
      if (index === FUND_ARRAY_LENGTH - 1) {
        logger.info(`Completed processing ${FUND_ARRAY_LENGTH} funds`);
        logger.info('erstemarket.hu fund collector finished!');
      }
    }
  });
})();
