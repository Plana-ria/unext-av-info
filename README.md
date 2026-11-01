# U-NEXT AV Info

U-NEXTの作品詳細ページや再生ページで、<strong>映像・音声の品質情報を確認できる</strong>ブラウザ拡張機能です。

作品詳細ページでは、設定で自動解析を許可すると、4K UHD・Dolby Atmosなどの配信情報やブラウザの対応状況を確認できます。再生ページでは、<strong>現在品質と最高品質</strong>を比較できます。

ブラウザで作品を探しながら4K画質やサラウンド音声への対応状況を確認し、Amazon Fire TVなどの対応端末に切り替えて視聴するかを判断する用途を想定しています。

※U-NEXT非公式の拡張機能です。

## 主な機能

### 作品ページの品質表示

作品詳細ページに「音声・映像の配信情報」を表示します。初期設定では、視聴履歴に未再生作品を追加しないために**再生関連APIを呼び出しません**。4K UHD・Dolby Vision・Dolby Atmosの公式特集と「ドルビー」検索結果に掲載される作品IDを利用して品質を表示します。

- **音声**：Dolby Atmos、Dolby Audio、2 ch（公式一覧・検索から判断）
- **映像**：4K UHD、Dolby Vision、または「Full HD 以下」
- 4K特集に非掲載の作品は「Full HD 以下」と表示し、作品ページには「＊HD / SD 画質の可能性もあります」と付記します。
- 解析しない場合は音声のコーデック・チャンネル詳細や映像解像度・コーデックを推測して追加しません。
- 履歴への追加を許容する設定では、従来の再生用プレイリストAPI・MPDによる詳細解析を利用できます。Atmosの場合、ch数を主表示に加えず、判明した場合はDolby Digital Plusなどのコーデック名のみ補足します。

### 再生ページの品質表示

再生中は「現在品質」と「最高品質」をそれぞれ表示します。再生ページは履歴への影響制御にかかわらず、実際の再生情報および必要なプレイリスト・MPDの解析を行います。現在品質は実際に再生しているトラック情報による値を維持します。

### 検索結果・一覧ページの品質表示

複数作品が並ぶ一覧・検索結果カードの下に、コンパクトな音声・映像2行の品質表示を追加します。**この機能は設定に関係なく再生関連APIを呼び出しません。** 公式特集とキーワード検索の取得済みIDを照合するだけです。

- 音声：Dolby Atmos / Dolby Audio / 2 ch
- 映像：4K UHD、Dolby Vision、または Full HD 以下
- 一覧カードでは「HD / SD 画質の可能性」などの補足文は省略します。

### 公式情報のキャッシュ

4K、Dolby Vision、Dolby Atmosの特集一覧および「ドルビー」の検索結果は**各24時間キャッシュ**します。全ページを取得できた場合だけ更新し、失敗時は既存キャッシュを保持します。認証情報はキャッシュしません。

## 設定

ツールバーの拡張機能アイコンを右クリックして設定します。

**表示項目**（独立したチェックボックス・初期値はすべてON）

- 作品ページの品質表示
- 再生ページの品質表示
- 検索結果・一覧ページでの品質表示

**再生履歴への影響制御**（二者択一）

- 未再生の作品が再生履歴へ追加されることを許容しない（初期値・推奨）
- 未再生の作品が再生履歴へ追加されることを許容する

旧設定 `allowTitleAnalysis` は引き継ぎません。新設定は独立して保存します。

## 重要：視聴履歴と判定精度

> [!CAUTION]
> **作品ページで履歴への追加を許容した場合、動画を再生しなくても履歴に追加される可能性があります。**

安全モードの作品ページおよび検索結果・一覧ページでは、拡張機能から再生関連APIを要求しません。再生ページは通常どおり解析します。

公式特集や「ドルビー」検索は作品の配信形式を推測するための情報源であり、全作品の対応状況を厳密に網羅しているとは限りません。**「ドルビー」検索結果にはDolby Audio以外の作品が混ざる可能性があり、Dolby Audioの表示だけでは5.1ch以上のサラウンド音声を保証しません。** 音声の「2 ch」や映像の「Full HD 以下」は、公式情報にヒットしない作品への既定表示であり、実際の配信仕様の確定情報ではありません。音声コーデック、ch数、映像解像度および再生可能な品質は端末・音声トラック・字幕/吹替などによって異なる場合があります。

ツールバーのアイコンをクリックすると拡張機能全体のON/OFFを切り替えられます。OFFにすると拡張機能による表示と追加照会を停止します。

## インストール

デスクトップ版ブラウザ向けのインストール手順です。Chrome・Edgeなどでは、一度追加すればブラウザを再起動しても利用できます。

### 共通の準備

1. このリポジトリの <strong>[Code → Download ZIP](https://github.com/Plana-ria/unext-av-info/archive/refs/heads/main.zip)</strong> から最新版をダウンロードします。
2. ZIPファイルを解凍します。<strong>`manifest.json` が入っているフォルダ</strong>を確認してください。
3. 以下から使用するブラウザの手順に従って読み込みます。

### Google Chrome

1. アドレスバーに `chrome://extensions/` と入力します。
2. <strong>デベロッパーモード</strong>をオンにします。
3. <strong>パッケージ化されていない拡張機能を読み込む</strong>をクリックし、`manifest.json` のあるフォルダを選びます。

### Microsoft Edge

1. アドレスバーに `edge://extensions/` と入力します。
2. <strong>開発者モード</strong>をオンにします。
3. <strong>展開して読み込み</strong>（Load unpacked）をクリックし、`manifest.json` のあるフォルダを選びます。

### その他のChromium系ブラウザ

以下のブラウザでも同じファイルを使用できます。インストール後にU-NEXTの作品情報・再生情報が表示されるか確認してください。

<details>
<summary><strong>Brave</strong></summary>

<ol>
<li>アドレスバーに <code>brave://extensions/</code> と入力します。</li>
<li><strong>デベロッパーモード</strong>（Developer mode）をオンにします。</li>
<li><strong>パッケージ化されていない拡張機能を読み込む</strong>（Load unpacked）から <code>manifest.json</code> のあるフォルダを選びます。</li>
</ol>
<p>Brave Shieldsなどの保護設定により、U-NEXTでの動作が変わる場合があります。</p>

</details>

<details>
<summary><strong>Vivaldi</strong></summary>

<ol>
<li>アドレスバーに <code>vivaldi://extensions/</code> と入力するか、メニューの <strong>ツール → 拡張機能</strong>を開きます。</li>
<li><strong>開発者モード</strong>（Developer mode）をオンにします。</li>
<li><strong>解凍してロード</strong>（Load unpacked）から <code>manifest.json</code> のあるフォルダを選びます。</li>
</ol>

</details>

<details>
<summary><strong>Opera / Opera GX</strong></summary>

<ol>
<li>アドレスバーに <code>opera://extensions/</code> と入力します（拡張機能管理画面を開きます）。</li>
<li><strong>開発者モード</strong>（Developer mode）を有効にします。</li>
<li><strong>解凍済み拡張機能を読み込む</strong>（Load unpacked）から <code>manifest.json</code> のあるフォルダを選びます。</li>
</ol>
<p>※Opera / Opera GXではバージョンによって画面上の名称が異なる場合があります。</p>

</details>

<details>
<summary><strong>Arc（デスクトップ版）</strong></summary>

<ol>
<li>Arcの拡張機能管理画面を開きます（<code>arc://extensions/</code> またはメニューの拡張機能管理）。</li>
<li><strong>Developer mode</strong> をオンにします。</li>
<li><strong>Load unpacked</strong> から <code>manifest.json</code> のあるフォルダを選びます。</li>
</ol>
<p>※Arcはプラットフォームやバージョンによって拡張機能管理画面が異なる場合があります。</p>

</details>

### Firefox（一時的なインストール）

<strong>Firefoxでは、この方法で追加した拡張機能は一時的なものです。Firefoxを終了・再起動すると削除されるため、次回利用するときは再度読み込んでください。</strong>

1. Firefoxのアドレスバーに `about:debugging` と入力します。
2. 左側の <strong>この Firefox</strong> を選びます。
3. <strong>一時的なアドオンを読み込む…</strong> をクリックします。
4. 解凍したフォルダ内で、元の `manifest.json` を `manifest.chromium.json` に名前変更し、`manifest.firefox.json` を `manifest.json` に名前変更します。
5. Firefoxで、その `manifest.json` を選びます。

※Firefoxでは専用の設定ファイルを使用します。Chrome・Edgeなどでは元の `manifest.json` をそのまま使用してください。

### インストール後・更新方法

U-NEXTの作品詳細ページと再生ページを開き、表示を確認してください。すでにページを開いている場合は再読み込みしてください。

- <strong>Chromium系</strong>：最新版のファイルに差し替えて拡張機能管理画面で <strong>再読み込み</strong>をクリックし、U-NEXTのページも再読み込みします。ローカル読み込み版は自動更新されません。
- <strong>Firefox</strong>：`about:debugging` にある拡張機能の <strong>再読み込み</strong>をクリックします。Firefoxを再起動した場合は再度一時インストールしてください。

## 制限事項

- <strong>未購入の「ポイント」作品</strong>では、配信情報を取得できず、最高品質を確認できない場合があります。
- 表示される最高品質は、取得できた配信情報に基づくものです。端末や契約状況、配信条件などによって、実際に再生できる品質とは異なる場合があります。
- Dolby Atmosを識別できない場合もあり、「Atmos非対応」と断定できるわけではありません。
- U-NEXT側の仕様変更により、情報を取得できなくなる場合があります。

## 技術的な仕組み

作品詳細ページで履歴への追加を許容した場合、または再生ページで最高品質を取得する場合に、U-NEXTのGraphQL APIを照会してDASH MPD内の映像・音声トラックを解析します。Dolby Atmosの識別には、MPDおよび音声初期化セグメント内の`dec3`情報を利用します。再生ページでは追加の照会を行うため、視聴履歴や再生セッションなどに影響する可能性があります。<strong>本編の復号やDRMの解除は行いません。</strong>

## ソース構成

| ファイル | 役割 |
|---|---|
| `manifest.json` | Chromium系ブラウザ拡張機能の設定 |
| `content.js` | 作品カード、配信情報解析、ブラウザ再生対応判定 |
| `probe.js` | 作品ID検出、U-NEXTのAPI照会 |
| `background.js` | 拡張機能側のデータ取得 |
| `playback-hook.js` | 再生時のメディア情報取得 |
| `playback-ui.js` | 再生画面の品質表示 |
| `dolby-feature.js` | 公式特集・検索結果のキャッシュと品質照合 |
| `list-quality.js` | 一覧・検索結果の品質表示 |

## セキュリティと免責

Cookie、認証トークン、署名付きURL、HAR、個人情報などをIssueや公開リポジトリに投稿しないでください。

### 免責事項

- 本ツールは個人が開発した非公式のChromium系ブラウザ拡張機能であり、U-NEXT、Dolbyおよび関連企業とは関係ありません。また、各社による承認・保証を受けたものではありません。
- 本ツールが表示する映像・音声情報および再生対応判定について、正確性、完全性、最新性を保証するものではありません。実際の再生品質や利用可能な機能は、端末、ブラウザ、契約状況、配信条件などによって異なります。
- U-NEXTやブラウザなどの仕様変更により、本ツールの一部または全部が予告なく利用できなくなる場合があります。継続的な提供、動作保証、サポートは約束していません。
- 本ツールはU-NEXTの非公開APIを利用しています。利用に際しては、U-NEXTの利用規約および適用される法令を確認してください。
- 本ツールの利用によって生じた不具合、データの損失、サービス利用上の問題、その他の損害について、開発者は適用法令で認められる範囲において責任を負いません。
- 本ツールの利用は各自の判断と責任で行ってください。
