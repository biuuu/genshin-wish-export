# Genshi Impact Wish Record Export

[中文](https://github.com/biuuu/genshin-gacha-export/blob/main/README.md) | English

A tool made from Electron that runs on the Windows 64 bit operating system.

Read the game log or proxy to get the authKey needed to access the game wish record API, and then use the authKey to read the game wish record.

The tool will save the data in the `userData` folder in the current directory and will merge with the local data when a new wish record is obtained.

## Other languages

Modify the JSON file in the `src/i18n/` directory to translate into the appropriate language.

If you feel that the existing translation is inappropriate, you can send a pull request to modify it at any time.

## Usage

1. Unzip after downloading the tool - [Download](https://github.com/biuuu/genshin-gacha-export/releases/latest/download/Genshin-Gacha-Export.zip)
2. Open the wish history of the game

    ![wish history](/docs/wish-history.png)

3. Click the tool's "Load data" button

    ![load data](/docs/load-data.png)

    If nothing goes wrong, you'll be prompted to read the data, and the final result will look like this

    <details>
    <summary>Expand the picture</summary>

    ![preview](/docs/preview.png)
    </details>

If you need to export the data of multiple accounts, you can click the plus button next to it.

Then switch to the new account of the game, open the wish history, and click the "load data" button in the tool.

## Devlopment

```
# install node modules
yarn install

# develop
yarn dev

# Build a program that can run
yarn build
```

## License

[MIT](https://github.com/biuuu/genshin-gacha-export/blob/main/LICENSE)

