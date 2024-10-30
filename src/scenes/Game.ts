import Phaser, { GameObjects, Scene } from 'phaser';

type Direction = 1 | 2;

// Интерфейс для объекта драгоценного камня
interface Gem {
  gemColor: number;
  gemSprite: GameObjects.Sprite;
  isEmpty: boolean;
}

// Интерфейс для выбранного камня, если он есть, или null
type SelectedGem = Gem | null;

const gameOptions = {
  fieldSize: 6,
  gemColors: 5,
  gemSize: 72,
  swapSpeed: 75,
  fallSpeed: 50,
  destroySpeed: 50,
};

const HORIZONTAL: Direction = 1;
const VERTICAL: Direction = 2;

export default class Demo extends Scene {
  private canPick: boolean = true;
  private dragging: boolean = false;
  private selectedGem: SelectedGem = null;
  private gameArray: Gem[][] = []; // Массив с объектами типа Gem
  private poolArray: Gem[] = []; // Пул для переиспользования камней
  private gemGroup!: Phaser.GameObjects.Group;
  private removeMap!: boolean[][];
  private swappingGems: [Gem, Gem] | null = null;
  private userScore: number = 0;
  private matches: number = 0;

  constructor() {
    super('GameScene');
  }

  preload() {
    this.load.spritesheet('gems', '/assets/items.png', {
      frameWidth: gameOptions.gemSize,
      frameHeight: gameOptions.gemSize,
    });
  }

  create() {
    this.drawField();
    this.input.on('pointerdown', this.gemSelect, this);
    this.input.on('pointermove', this.startSwipe, this);
    this.input.on('pointerup', this.stopSwipe, this);
  }

  // Рисуем игровое поле
  drawField() {
    this.gemGroup = this.add.group();
    for (let i = 0; i < gameOptions.fieldSize; i++) {
      this.gameArray[i] = [];
      for (let j = 0; j < gameOptions.fieldSize; j++) {
        const gem = this.add.sprite(
          gameOptions.gemSize * j + gameOptions.gemSize / 2,
          gameOptions.gemSize * i + gameOptions.gemSize / 2,
          'gems'
        );
        this.gemGroup.add(gem);

        // Устанавливаем случайный цвет до тех пор, пока не будет совпадений
        let randomColor;
        do {
          randomColor = Phaser.Math.Between(0, gameOptions.gemColors - 1);
          gem.setFrame(randomColor);
          this.gameArray[i][j] = {
            gemColor: randomColor,
            gemSprite: gem,
            isEmpty: false,
          };
        } while (this.isMatch(i, j));
      }
    }
  }

  // Проверяем совпадения на горизонтальную и вертикальную линии
  isMatch(row: number, col: number) {
    return this.isHorizontalMatch(row, col) || this.isVerticalMatch(row, col);
  }

  isHorizontalMatch(row: number, col: number) {
    return (
      this.gemAt(row, col)?.gemColor === this.gemAt(row, col - 1)?.gemColor &&
      this.gemAt(row, col)?.gemColor === this.gemAt(row, col - 2)?.gemColor
    );
  }

  isVerticalMatch(row: number, col: number) {
    return (
      this.gemAt(row, col)?.gemColor === this.gemAt(row - 1, col)?.gemColor &&
      this.gemAt(row, col)?.gemColor === this.gemAt(row - 2, col)?.gemColor
    );
  }

  gemAt(row: number, col: number): Gem | null {
    if (row < 0 || row >= gameOptions.fieldSize || col < 0 || col >= gameOptions.fieldSize) {
      return null;
    }
    return this.gameArray[row][col];
  }

gemSelect(pointer: Phaser.Input.Pointer) {
  if (!this.canPick) return;

  this.dragging = true;
  const row = Math.floor(pointer.y / gameOptions.gemSize);
  const col = Math.floor(pointer.x / gameOptions.gemSize);
  const pickedGem = this.gemAt(row, col);

  if (pickedGem) {
    if (!this.selectedGem) {
      this.selectGem(pickedGem);
    } else {
      this.handleSelectedGem(pickedGem);
    }
  }
}

selectGem(gem: any) {
  gem.gemSprite.setScale(1.2);
  gem.gemSprite.setDepth(1);
  this.selectedGem = gem;
}

deselectGem() {
  if (this.selectedGem) {
    this.selectedGem.gemSprite.setScale(1);
    this.selectedGem = null;
  }
}

handleSelectedGem(pickedGem: any) {
  if (this.areTheSame(pickedGem, this.selectedGem)) {
    this.deselectGem();
  } else if (this.areNext(pickedGem, this.selectedGem)) {
    this.selectedGem.gemSprite.setScale(1);
    this.swapGems(this.selectedGem, pickedGem, true);
  } else {
    this.deselectGem();
    this.selectGem(pickedGem);
  }
}


  startSwipe(pointer: Phaser.Input.Pointer) {
    if (!this.dragging || !this.selectedGem) return;
  
    const deltaX = pointer.downX - pointer.x;
    const deltaY = pointer.downY - pointer.y;
  
    // Определяем изменения в строке и столбце на основе свайпа
    const delta = this.getSwipeDelta(deltaX, deltaY);
  
    if (delta.row !== 0 || delta.col !== 0) {
      const targetGem = this.gemAt(
        this.getGemRow(this.selectedGem) + delta.row,
        this.getGemCol(this.selectedGem) + delta.col
      );
  
      if (targetGem) {
        this.selectedGem.gemSprite.setScale(1);
        this.swapGems(this.selectedGem, targetGem, true);
      }
    }
  }
  
  getSwipeDelta(deltaX: number, deltaY: number) {
    const delta = { row: 0, col: 0 };
  
    if (deltaX > gameOptions.gemSize / 2 && Math.abs(deltaY) < gameOptions.gemSize / 4) {
      delta.col = -1; // Swipe left
    } else if (deltaX < -gameOptions.gemSize / 2 && Math.abs(deltaY) < gameOptions.gemSize / 4) {
      delta.col = 1; // Swipe right
    }
  
    if (deltaY > gameOptions.gemSize / 2 && Math.abs(deltaX) < gameOptions.gemSize / 4) {
      delta.row = -1; // Swipe up
    } else if (deltaY < -gameOptions.gemSize / 2 && Math.abs(deltaX) < gameOptions.gemSize / 4) {
      delta.row = 1; // Swipe down
    }
  
    return delta;
  }
  

  stopSwipe() {
    this.dragging = false;
  }

  areTheSame(gem1: Gem, gem2: Gem) {
    return this.getGemRow(gem1) === this.getGemRow(gem2) && this.getGemCol(gem1) === this.getGemCol(gem2);
  }

  getGemRow(gem: Gem) {
    return Math.floor(gem.gemSprite.y / gameOptions.gemSize);
  }

  getGemCol(gem: Gem) {
    return Math.floor(gem.gemSprite.x / gameOptions.gemSize);
  }

  areNext(gem1: Gem, gem2: Gem) {
    return (
      Math.abs(this.getGemRow(gem1) - this.getGemRow(gem2)) +
      Math.abs(this.getGemCol(gem1) - this.getGemCol(gem2)) ===
      1
    );
  }

  // Метод для обмена местами двух камней (определение отсутствует в коде)


  swapGems(gem1: number, gem2: number, swapBack: boolean) {
    // Начинаем процесс обмена камней, блокируем взаимодействие с игровым полем
    this.swappingGems = 2;
    this.canPick = false;
    this.dragging = false;

    // Сохраняем цвета и спрайты для обмена
    const fromColor = gem1.gemColor;
    const fromSprite = gem1.gemSprite;
    const toColor = gem2.gemColor;
    const toSprite = gem2.gemSprite;

    // Получаем позиции каждого камня в массиве
    const gem1Row = this.getGemRow(gem1);
    const gem1Col = this.getGemCol(gem1);
    const gem2Row = this.getGemRow(gem2);
    const gem2Col = this.getGemCol(gem2);

    // Обновляем массив игры с новыми значениями цветов и спрайтов после обмена
    this.gameArray[gem1Row][gem1Col].gemColor = toColor;
    this.gameArray[gem1Row][gem1Col].gemSprite = toSprite;
    this.gameArray[gem2Row][gem2Col].gemColor = fromColor;
    this.gameArray[gem2Row][gem2Col].gemSprite = fromSprite;

    // Запускаем анимацию обмена для каждого камня
    this.tweenGem(gem1, gem2, swapBack);
    this.tweenGem(gem2, gem1, swapBack);
  }

  tweenGem(gem1: number, gem2: number, swapBack: boolean) {
    const row = this.getGemRow(gem1);
    const col = this.getGemCol(gem1);

    // Анимация для передвижения камня к новой позиции
    this.tweens.add({
      targets: this.gameArray[row][col].gemSprite,
      x: col * gameOptions.gemSize + gameOptions.gemSize / 2,
      y: row * gameOptions.gemSize + gameOptions.gemSize / 2,
      duration: gameOptions.swapSpeed,
      callbackScope: this,
      onComplete: () => {
        this.swappingGems--;

        // Проверяем завершение анимации обмена
        if (this.swappingGems === 0) {
          if (!this.matchInBoard() && swapBack) {
            // Если нет совпадений, возвращаем камни на исходные позиции
            this.swapGems(gem1, gem2, false);
          } else {
            // Если есть совпадения, обрабатываем их
            this.matchInBoard() ? this.handleMatches() : this.enablePicking();
          }
        }
      }
    });
  }

  enablePicking() {
    this.canPick = true;
    this.selectedGem = null;
  }

  matchInBoard() {
    // Проверяем наличие совпадений на игровом поле
    for (let i = 0; i < gameOptions.fieldSize; i++) {
      for (let j = 0; j < gameOptions.fieldSize; j++) {
        if (this.isMatch(i, j)) return true;
      }
    }
    return false;
  }

  handleMatches() {
    console.log("markMatches function exists:", typeof this.markMatches === "function"); // Проверка наличия функции
  
    this.removeMap = Array.from({ length: gameOptions.fieldSize }, () => Array(gameOptions.fieldSize).fill(0));
    
    if (typeof this.markMatches === "function") {
      this.markMatches(HORIZONTAL);
      this.markMatches(VERTICAL);
    } else {
      console.error("markMatches function is not defined in this context");
    }
  
    this.destroyGems();
  }
  

  markMatches(direction: number) {
    const { fieldSize } = gameOptions;
  
    for (let i = 0; i < fieldSize; i++) {
      let colorStreak = 1;
      let startStreak = 0;
      let currentColor = -1;
  
      for (let j = 0; j <= fieldSize; j++) {  // j <= fieldSize, чтобы обработать конец ряда
        const colorToWatch = (j < fieldSize) 
          ? (direction === HORIZONTAL ? this.gemAt(i, j).gemColor : this.gemAt(j, i).gemColor)
          : -1;  // Искусственное завершение ряда для обработки последней серии
  
        if (colorToWatch === currentColor) {
          colorStreak++;
        } else {
          if (colorStreak >= 3) {
            this.updateRemoveMap(i, startStreak, colorStreak, direction);
          }
          startStreak = j;  // Начинаем новую серию
          colorStreak = 1;
          currentColor = colorToWatch;
        }
      }
    }
  }
  
  

  updateRemoveMap(i: number, startStreak: number, colorStreak: number, direction: number) {
    for (let k = 0; k < colorStreak; k++) {
      if (direction === HORIZONTAL) {
        this.removeMap[i][startStreak + k]++;
      } else {
        this.removeMap[startStreak + k][i]++;
      }
    }
  }

  destroyGems() {
    this.matches++;
    
    // Увеличиваем множитель, если счет совпадений кратен 3
    if (this.matches % 3 === 0) {
      this.userScore++;
      // store.dispatch(actions.setUserMultiplier(this.userScore)); // Обновление UI
    }
  
    let destroyed = 0;
  
    const onGemDestroyed = (i, j) => {
      destroyed--;
      this.gameArray[i][j].gemSprite.visible = false;
      this.poolArray.push(this.gameArray[i][j].gemSprite);
      this.gameArray[i][j].isEmpty = true;
  
      // Проверяем, если все уничтоженные камни обработаны, чтобы заполнить поле новыми камнями
      if (destroyed === 0) {
        this.makeGemsFall();
        this.replenishField();
      }
    };
  
    this.gameArray.forEach((row, i) => {
      row.forEach((tile, j) => {
        if (this.removeMap[i][j] > 0) {
          destroyed++;
          
          // Анимация исчезновения
          this.tweens.add({
            targets: tile.gemSprite,
            alpha: 0,
            duration: gameOptions.destroySpeed,
            callbackScope: this,
            onComplete: () => onGemDestroyed(i, j),
          });
        }
      });
    });
  }
  makeGemsFall() {
    const { fieldSize, gemSize, fallSpeed } = gameOptions;
  
    for (let j = 0; j < fieldSize; j++) {
      let emptySpace = 0;
  
      for (let i = fieldSize - 1; i >= 0; i--) {
        const tile = this.gameArray[i][j];
  
        if (tile.isEmpty) {
          emptySpace++;
        } else if (emptySpace > 0) {
          const { gemSprite } = tile;
          const targetY = gemSprite.y + emptySpace * gemSize;
  
          // Анимация падения
          this.tweens.add({
            targets: gemSprite,
            y: targetY,
            duration: fallSpeed * emptySpace,
          });
  
          // Обновляем игровое поле
          this.gameArray[i + emptySpace][j] = {
            gemColor: tile.gemColor, // Сохраняем цвет
            gemSprite: tile.gemSprite, // Сохраняем спрайт
            isEmpty: false
          };
          this.gameArray[i][j].isEmpty = true; // Очищаем ячейку
        }
      }
    }
  }
  
  
  holesBelow(row: number, col: number) {
    let result = 0
    for (let i = row + 1; i < gameOptions.fieldSize; i++) {
      if (this.gameArray[i][col].isEmpty) {
        result++
      }
    }
    return result
  }
  replenishField() {
    let replenished = 0;
    const { fieldSize, gemSize, fallSpeed, gemColors } = gameOptions;
  
    const animateGemFall = (gemSprite, targetY, emptySpots) => {
      this.tweens.add({
        targets: gemSprite,
        y: targetY,
        duration: fallSpeed * emptySpots,
        callbackScope: this,
        onComplete: onGemFallComplete,
      });
    };
  
    const setupGem = (i, j, emptySpots) => {
      replenished++;
      const randomColor = Phaser.Math.Between(0, gemColors - 1);
  
      // Создаем и настраиваем новый камень
      const gemSprite = this.poolArray.pop();
      gemSprite.setFrame(randomColor);
      gemSprite.visible = true;
      gemSprite.alpha = 1;
      gemSprite.x = gemSize * j + gemSize / 2;
      gemSprite.y = gemSize / 2 - (emptySpots - i) * gemSize;
  
      // Обновляем ячейку в gameArray
      this.gameArray[i][j] = { gemColor: randomColor, gemSprite, isEmpty: false };
  
      // Анимация падения
      animateGemFall(gemSprite, gemSize * i + gemSize / 2, emptySpots);
    };
  
    const onGemFallComplete = () => {
      replenished--;
      if (replenished === 0) {
        if (this.matchInBoard()) {
          this.time.addEvent({
            delay: 250,
            callback: this.handleMatches.bind(this), // Привязываем контекст `this`
          });
        } else {
          this.canPick = true;
          this.selectedGem = null;
        }
      }
    };
  
    for (let j = 0; j < fieldSize; j++) {
      const emptySpots = this.holesInCol(j);
      Array.from({ length: emptySpots }).forEach((_, i) => setupGem(i, j, emptySpots));
    }
  }
  

  holesInCol(col: number) {
    var result = 0
    for (let i = 0; i < gameOptions.fieldSize; i++) {
      if (this.gameArray[i][col].isEmpty) {
        result++
      }
    }
    return result
  }
}
