export const I18N = {
  ja: {
    title: '数独 (Sudoku)',
    clueLabel: 'ヒント数',
    seedLabel: 'シード（空白でランダム）',
    langLabel: '言語',
    themeLabel: '表示',
    themeSystem: 'システム設定',
    themeLight: 'ライト',
    themeDark: 'ダーク',
    preferenceSaveLabel: '設定保存',
    preferenceSaveTitle: 'ヒント数、シード、言語、表示をこのブラウザに保存',
    seedPlaceholder: 'オプション（空白でランダム）',
    newGame: '新しい盤面を作成',
    reset: '最初の状態に戻す',
    hint: 'ヒントを埋める',
    solve: '答えを表示',
    saveGame: '保存',
    loadGame: '読込',
    helpButton: '遊び方',
    helpClose: '閉じる',
    padTitle: '数字パッド',
    undo: '↩️ １つ戻す',
    redo: '↪️ １つ進める',
    noteButton: '✏️ メモ',
    redNoteButton: '🔴 赤メモ',
    clearButton: '消去',
    boardAriaLabel: '数独盤面',
    hintText: 'キーボードの 1-9 で入力、0 / Delete / Backspace で削除、矢印で移動、Enter でメモモード切替ができます。赤色メモは 🔴 赤メモ ボタン、右クリック、または Shift+1〜9 で入力できます。',
    statusLoading: '読み込み中...',
    statusGenerating: '生成中...',
    statusInputPrompt: '数字を入力してください。',
    statusNoHint: 'ヒントを出せるマスがありません。',
    statusSolved: 'おめでとうございます！すべて正解です。（タイム: {time}）',
    statusSolutionShown: '解答を表示しました。',
    statusSaveSuccess: '現在の状態を保存しました。',
    statusSaveError: '状態を保存できませんでした。',
    statusSaveUnavailable: '保存できる盤面がありません。',
    statusLoadSuccess: '保存した状態を読み込みました。',
    statusLoadError: '保存ファイルを読み込めませんでした。',
    statsHintUsed: 'ヒント使用: {count}回',
    statsSolutionShown: '解答表示: {state}',
    statsClues: '実ヒント数: {count}',
    statsSeed: 'シード: {seed}',
    yes: 'あり',
    no: 'なし',
    randomSeed: 'ランダム({seed})',
    helpTitle: '遊び方',
    helpSections: [
      {
        items: [
          { label: 'はじめに', text: '盤面のマスを選んで、1から9までの数字を入力してください。' },
          { label: 'ゴール', text: 'タテ、ヨコ、太線で囲まれた3x3のブロックのどれにも、1から9までの数字が1つずつ入れば完成です。' },
          { label: '正解は1つ', text: '生成される盤面はすべて、正解は1つのみです。' },
          { label: 'ハイライト', text: '重複する数字と、9個すべて正しく埋まった数字は、ハイライト表示されます。' },
          { label: 'オフライン', text: 'オフラインで遊べます。ゲームプレイ中の操作はインターネット通信を生じさせません。' }
        ]
      },
      {
        title: '盤面上部にあるコントロールとボタン',
        items: [
          { label: 'ヒント数', text: '新しい盤面を作るときの初期ヒント数を選びます。' },
          { label: 'シード', text: '同じ値を入れると、同じ盤面を再生成できます。空欄ならランダムです。' },
          { label: '言語', text: '画面表示の言語を切り替えます。' },
          { label: '表示', text: 'システム設定、ライト、ダークから画面の配色を選びます。システム設定ではOSやブラウザの配色設定に追従します。' },
          { label: '設定保存', text: 'ONにすると、ヒント数、シード、言語、表示をこのブラウザに保存し、次回起動時に復元します。初期状態はOFFです。OFFにすると保存済みの設定を削除します。' },
          { label: '新しい盤面を作成', text: '現在の設定で新しい数独を生成します。' },
          { label: '最初の状態に戻す', text: '開始時点の盤面に戻します。タイマーも最初からやり直します。' },
          { label: 'ヒントを埋める', text: '空いているマスを 1 つだけ正解で埋めます。' },
          { label: '答えを表示', text: '完成した解答を表示します。' },
          { label: '遊び方', text: 'ヘルプを開きます。オフラインで読めます。' },
          { label: '保存', text: '現在の盤面、メモ、タイマー、Undo/Redo の履歴を JSON ファイルとして保存します。' },
          { label: '読込', text: '保存した JSON ファイルを読み込み、同じ状態から再開します。' }
        ]
      },
      {
        title: '操作方法（マウス/タップ）',
        items: [
          { label: 'マスを選ぶ', text: '盤面のマスを選びます。' },
          { label: '数字入力', text: '数字パッドで数字を入力します。' },
          { label: '消去', text: '選択中のマスを消去します。' },
          { label: '✏️ メモ', text: 'メモ入力モードに切り替えます。メモ入力モード中に数字を入力するとメモを入れられます。' },
          { label: '🔴 赤メモ', text: 'メモ入力を赤色メモに切り替えます。メモ入力モード中に数字をマウスで右クリックしても赤色メモを入れられます。' },
          { label: '↩️ １つ戻す', text: '直前の入力やメモを取り消します。' },
          { label: '↪️ １つ進める', text: '取り消した入力やメモをやり直します。' }
        ]
      },
      {
        title: '操作方法（キーボード）',
        items: [
          { label: '矢印キー', text: '盤面のマスを移動します。' },
          { label: '1〜9', text: '数字を入力します。' },
          { label: '0 / Backspace / Delete', text: '選択中のマスを消去します。' },
          { label: 'Enter', text: 'メモ入力モードに切り替えます。' },
          { label: 'Shift+1〜9', text: '赤色メモを入力します。' },
          { label: 'Ctrl+Z', text: '1つ戻します。' },
          { label: 'Ctrl+Y または Ctrl+Shift+Z', text: '1つ進めます。' }
        ]
      },
      {
        title: '詳細情報',
        items: [
          {
            label: 'GitHub レポジトリ',
            href: 'https://github.com/piccoripico/sudoku-html',
            linkText: 'https://github.com/piccoripico/sudoku-html',
            note: '※インターネット接続が必要です。'
          }
        ]
      }
    ],
    clueOptionLabels: {
      17: '17 (最難関)',
      24: '24 (かなり難しい)',
      28: '28 (難しめ)',
      32: '32 (標準)',
      38: '38 (易しめ)',
      44: '44 (かなり易しい)'
    }
  },
  en: {
    title: 'Sudoku',
    clueLabel: 'Clues',
    seedLabel: 'Seed (blank for random)',
    langLabel: 'Language',
    themeLabel: 'Theme',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    preferenceSaveLabel: 'Save settings',
    preferenceSaveTitle: 'Save clues, seed, language, and theme in this browser',
    seedPlaceholder: 'Optional (blank for random)',
    newGame: 'New Puzzle',
    reset: 'Reset to Start',
    hint: 'Fill a Hint',
    solve: 'Show Solution',
    saveGame: 'Save',
    loadGame: 'Load',
    helpButton: 'How to Play',
    helpClose: 'Close',
    padTitle: 'Number Pad',
    undo: '↩️ Undo',
    redo: '↪️ Redo',
    noteButton: '✏️ Note',
    redNoteButton: '🔴 Red Note',
    clearButton: 'Clear',
    boardAriaLabel: 'Sudoku board',
    hintText: 'Use 1-9 to input, 0 / Delete / Backspace to clear, arrow keys to move, and Enter to toggle note mode. Red notes can be entered with the 🔴 Red Note button, right-click, or Shift+1-9.',
    statusLoading: 'Loading...',
    statusGenerating: 'Generating...',
    statusInputPrompt: 'Enter numbers to solve the puzzle.',
    statusNoHint: 'No empty cell is available for a hint.',
    statusSolved: 'Congratulations! Puzzle solved. (Time: {time})',
    statusSolutionShown: 'Solution displayed.',
    statusSaveSuccess: 'The current state has been saved.',
    statusSaveError: 'The current state could not be saved.',
    statusSaveUnavailable: 'There is no puzzle state to save.',
    statusLoadSuccess: 'The saved state has been loaded.',
    statusLoadError: 'The save file could not be loaded.',
    statsHintUsed: 'Hints used: {count}',
    statsSolutionShown: 'Solution shown: {state}',
    statsClues: 'Actual clues: {count}',
    statsSeed: 'Seed: {seed}',
    yes: 'yes',
    no: 'no',
    randomSeed: 'random({seed})',
    helpTitle: 'How to Play',
    helpSections: [
      {
        items: [
          { label: 'Getting started', text: 'Select a cell and enter a number from 1 to 9.' },
          { label: 'Goal', text: 'The puzzle is complete when every row, column, and 3x3 block outlined by the thick lines contains each number from 1 to 9 exactly once.' },
          { label: 'Unique solution', text: 'Every generated puzzle has exactly one solution.' },
          { label: 'Highlighting', text: 'Duplicate numbers and numbers that have been correctly completed in all nine positions are highlighted.' },
          { label: 'Offline', text: 'You can play offline. Gameplay itself does not require any internet connection.' }
        ]
      },
      {
        title: 'Controls and Buttons Above the Board',
        items: [
          { label: 'Clues', text: 'Sets the number of starting clues for the next puzzle.' },
          { label: 'Seed', text: 'Enter the same seed to recreate the same puzzle. Leave it blank for a random puzzle.' },
          { label: 'Language', text: 'Switches the interface language.' },
          { label: 'Theme', text: 'Choose System, Light, or Dark. System follows the color preference of your operating system or browser.' },
          { label: 'Save settings', text: 'When enabled, the clue count, seed, language, and theme are saved in this browser and restored the next time you open the app. It is off by default. Turning it off removes the saved preferences.' },
          { label: 'New Puzzle', text: 'Generates a fresh puzzle with the current settings.' },
          { label: 'Reset to Start', text: 'Returns the board to its initial state. The timer also starts over.' },
          { label: 'Fill a Hint', text: 'Reveals one correct value in an empty cell.' },
          { label: 'Show Solution', text: 'Displays the completed solution.' },
          { label: 'How to Play', text: 'Opens the help dialog. It is available offline.' },
          { label: 'Save', text: 'Saves the current board, notes, timer, and Undo/Redo history as a JSON file.' },
          { label: 'Load', text: 'Loads a saved JSON file and resumes from the same state.' }
        ]
      },
      {
        title: 'Controls (Mouse / Tap)',
        items: [
          { label: 'Select a cell', text: 'Select a cell on the board.' },
          { label: 'Enter a number', text: 'Use the number pad to enter a number.' },
          { label: 'Clear', text: 'Clears the selected cell.' },
          { label: '✏️ Note', text: 'Switches to note input mode. When note input mode is on, entering a number adds a note.' },
          { label: '🔴 Red Note', text: 'Switches note input to red notes. While note input mode is on, you can also right-click a number with the mouse to enter a red note.' },
          { label: '↩️ Undo', text: 'Undoes the most recent input or note.' },
          { label: '↪️ Redo', text: 'Reapplies an undone input or note.' }
        ]
      },
      {
        title: 'Controls (Keyboard)',
        items: [
          { label: 'Arrow keys', text: 'Move between cells.' },
          { label: '1-9', text: 'Enter a number.' },
          { label: '0 / Backspace / Delete', text: 'Clear the selected cell.' },
          { label: 'Enter', text: 'Switch to note input mode.' },
          { label: 'Shift+1-9', text: 'Enter a red note.' },
          { label: 'Ctrl+Z', text: 'Undo.' },
          { label: 'Ctrl+Y or Ctrl+Shift+Z', text: 'Redo.' }
        ]
      },
      {
        title: 'More Information',
        items: [
          {
            label: 'GitHub Repository',
            href: 'https://github.com/piccoripico/sudoku-html',
            linkText: 'https://github.com/piccoripico/sudoku-html',
            note: '*Internet connection required.'
          }
        ]
      }
    ],
    clueOptionLabels: {
      17: '17 (hardest)',
      24: '24 (very hard)',
      28: '28 (hard)',
      32: '32 (normal)',
      38: '38 (easy)',
      44: '44 (very easy)'
    }
  }
} as const;

export type Language = keyof typeof I18N;

type JapaneseDictionary = typeof I18N.ja;

export type TranslationKey = {
  [Key in keyof JapaneseDictionary]: JapaneseDictionary[Key] extends string ? Key : never;
}[keyof JapaneseDictionary];

export type TranslationVariables = Readonly<Record<string, string | number>>;

export function isLanguage(value: string): value is Language {
  return value === 'ja' || value === 'en';
}

export function translate(
  lang: string,
  key: TranslationKey,
  vars: TranslationVariables = {}
): string {
  const dict = isLanguage(lang) ? I18N[lang] : I18N.ja;
  const template = dict[key] ?? I18N.ja[key] ?? '';
  return String(template).replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''));
}
