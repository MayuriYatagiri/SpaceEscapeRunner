import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Dimensions, 
  StatusBar,
  Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Dimensions Configuration
const SHIP_WIDTH = 50;
const SHIP_HEIGHT = 50;
const ASTEROID_SIZE = 110; 
const MOVEMENT_STEP = 35; 

const ARENA_HEIGHT = SCREEN_HEIGHT - 350; 
const SHIP_Y = ARENA_HEIGHT - SHIP_HEIGHT - 10; 
const HIGH_SCORE_KEY = '@space_escape_highscore';

export default function App() {
  // --- ANIMATION STATES (BACKGROUND) ---
  const scrollY = useRef(new Animated.Value(0)).current;

  // --- GAME STATES ---
  const [gameState, setGameState] = useState('PLAYING'); 
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  const [shipX, setShipX] = useState((SCREEN_WIDTH / 2) - (SHIP_WIDTH / 2));
  const [asteroidX, setAsteroidX] = useState(Math.random() * (SCREEN_WIDTH - ASTEROID_SIZE));
  const [asteroidY, setAsteroidY] = useState(0);

  // --- BACKGROUND INFINITE SCROLL LOOP ---
  useEffect(() => {
    let backgroundAnimation;
    
    const startBackgroundScroll = () => {
      scrollY.setValue(0);
      backgroundAnimation = Animated.timing(scrollY, {
        toValue: ARENA_HEIGHT, // Matches your specific arena viewport limit
        duration: 6000,        // Speed of the falling background star field
        useNativeDriver: true, // Executes directly on the hardware layer to keep JS loop free
      });
      
      backgroundAnimation.start((result) => {
        if (result.finished) {
          startBackgroundScroll();
        }
      });
    };

    if (gameState === 'PLAYING') {
      startBackgroundScroll();
    }

    return () => {
      if (backgroundAnimation) backgroundAnimation.stop();
    };
  }, [gameState, scrollY]);

  // Interpolated positional loops matching the bounds of the arena height
  const translateTileA = scrollY.interpolate({
    inputRange: [0, ARENA_HEIGHT],
    outputRange: [0, ARENA_HEIGHT],
  });
  const translateTileB = scrollY.interpolate({
    inputRange: [0, ARENA_HEIGHT],
    outputRange: [-ARENA_HEIGHT, 0],
  });

  // --- HIGH SCORE PERSISTENCE ---
  useEffect(() => {
    loadSavedHighScore();
  }, []);

  const loadSavedHighScore = async () => {
    try {
      const savedValue = await AsyncStorage.getItem(HIGH_SCORE_KEY);
      if (savedValue !== null) {
        setHighScore(parseInt(savedValue, 10));
      }
    } catch (error) {
      console.log('Error reading high score:', error);
    }
  };

  // --- MAIN PHYSICS TICK RATE LOOP ---
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const gameLoop = setInterval(() => {
      setAsteroidY((currentY) => {
        const nextY = currentY + 9; 

        if (nextY >= ARENA_HEIGHT - ASTEROID_SIZE) {
          setAsteroidX(Math.random() * (SCREEN_WIDTH - ASTEROID_SIZE));
          setScore((prevScore) => prevScore + 1);
          return 0; 
        }
        return nextY; 
      });
    }, 33); 

    return () => clearInterval(gameLoop);
  }, [gameState]);

  // --- COLLISION VERIFICATION ENGINE ---
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const shipLeft = shipX;
    const shipRight = shipX + SHIP_WIDTH;
    const shipTop = SHIP_Y;
    const shipBottom = SHIP_Y + SHIP_HEIGHT;

    const asteroidLeft = asteroidX;
    const asteroidRight = asteroidX + ASTEROID_SIZE;
    const asteroidTop = asteroidY;
    const asteroidBottom = asteroidY + ASTEROID_SIZE;

    if (
      shipLeft < asteroidRight &&
      shipRight > asteroidLeft &&
      shipTop < asteroidBottom &&
      shipBottom > asteroidTop
    ) {
      handleGameOver();
    }
  }, [shipX, asteroidX, asteroidY, gameState]);

  const handleGameOver = async () => {
    setGameState('GAME_OVER');
    if (score > highScore) {
      setHighScore(score);
      try {
        await AsyncStorage.setItem(HIGH_SCORE_KEY, score.toString());
      } catch (error) {
        console.log('Failed to save record score:', error);
      }
    }
  };

  const restartGame = () => {
    setScore(0);
    setShipX((SCREEN_WIDTH / 2) - (SHIP_WIDTH / 2));
    setAsteroidY(0);
    setAsteroidX(Math.random() * (SCREEN_WIDTH - ASTEROID_SIZE));
    setGameState('PLAYING');
  };

  const moveLeft = () => {
    if (gameState !== 'PLAYING') return;
    setShipX((currentX) => Math.max(0, currentX - MOVEMENT_STEP));
  };

  const moveRight = () => {
    if (gameState !== 'PLAYING') return;
    setShipX((currentX) => Math.min(SCREEN_WIDTH - SHIP_WIDTH, currentX + MOVEMENT_STEP));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER HUD */}
      <View style={styles.header}>
        <Text style={styles.titleText}>SPACE ESCAPE</Text>
        <Text style={styles.subtitleText}>ARMAGEDDON MODE</Text>
      </View>

      {/* PLAYABLE GAME ARENA */}
      <View style={[styles.gameArena, { height: ARENA_HEIGHT }]}>
        
        {/* BACKGROUND LAYER: Parallax scrolling star field pattern sheet loops */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <Animated.View style={[styles.starTile, { transform: [{ translateY: translateTileA }] }]}>
            <StarFieldPattern />
          </Animated.View>
          <Animated.View style={[styles.starTile, { transform: [{ translateY: translateTileB }] }]}>
            <StarFieldPattern />
          </Animated.View>
        </View>

        {gameState === 'PLAYING' ? (
          <>
            <View style={styles.hudRow}>
              <Text style={styles.liveScore}>SCORE: {score}</Text>
              <Text style={styles.recordScore}>BEST: {highScore}</Text>
            </View>

            {/* UPGRADED MASSIVE ROUND TEXTURED ASTEROID */}
            <View style={[styles.asteroidBase, { left: asteroidX, top: asteroidY }]}>
              <View style={[styles.crater, styles.craterGiant, { top: 15, left: 25 }]} />
              <View style={[styles.crater, styles.craterLarge, { top: 25, right: 20 }]} />
              <View style={[styles.crater, styles.craterMedium, { bottom: 25, left: 20 }]} />
              <View style={[styles.crater, styles.craterLarge, { bottom: 15, right: 30 }]} />
            </View>

            {/* SPACESHIP CONTAINER */}
            <View style={[styles.spaceshipContainer, { left: shipX, top: SHIP_Y }]}>
              <View style={styles.noseCone} />
              <View style={styles.fuselage} />
              <View style={styles.leftStabilizer} />
              <View style={styles.rightStabilizer} />
            </View>
          </>
        ) : (
          <View style={styles.gameOverOverlay}>
            <Text style={styles.failedText}>MISSION FAILED</Text>
            <Text style={styles.finalScoreText}>SCORE ACQUIRED: {score}</Text>
            
            {score >= highScore && score > 0 ? (
              <Text style={styles.newRecordNotice}>🔥 NEW HIGH SCORE! 🔥</Text>
            ) : (
              <Text style={styles.bestRecordText}>CURRENT RECORD: {highScore}</Text>
            )}

            <TouchableOpacity style={styles.restartBtn} onPress={restartGame}>
              <Text style={styles.restartBtnText}>LAUNCH AGAIN</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>

      {/* ACTION PANEL CONTROL DECK */}
      <View style={styles.controlPanel}>
        <TouchableOpacity style={styles.actionButton} onPress={moveLeft}>
          <Text style={styles.actionButtonText}>◀ MOVE LEFT</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={moveRight}>
          <Text style={styles.actionButtonText}>MOVE RIGHT ▶</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Vector Starfield Component Sheet
function StarFieldPattern() {
  return (
    <View style={styles.starField}>
      <View style={[styles.star, { top: '10%', left: '15%' }]} />
      <View style={[styles.star, { top: '30%', left: '80%', width: 3, height: 3 }]} />
      <View style={[styles.star, { top: '50%', left: '45%', opacity: 0.4 }]} />
      <View style={[styles.star, { top: '70%', left: '25%', width: 4, height: 4 }]} />
      <View style={[styles.star, { top: '85%', left: '75%' }]} />
    </View>
  );
}

// GRAPHICS STYLE MATRIX
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070714',
    justifyContent: 'space-between',
    paddingVertical: 50,
  },
  header: {
    alignItems: 'center',
  },
  titleText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: '#FF0055',
    letterSpacing: 4,
    marginTop: 2,
  },
  gameArena: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#0D0D26', 
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#1A1A3A',
    overflow: 'hidden', // Clips scrolling background sheets perfectly to the play deck
  },
  starTile: {
    position: 'absolute',
    width: '100%',
    height: ARENA_HEIGHT,
  },
  starField: {
    flex: 1,
    position: 'relative',
  },
  star: {
    position: 'absolute',
    width: 2,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    opacity: 0.6,
  },
  hudRow: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  liveScore: {
    color: '#00F5D4',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  recordScore: {
    color: '#FFE600',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  asteroidBase: {
    position: 'absolute',
    width: ASTEROID_SIZE,
    height: ASTEROID_SIZE,
    backgroundColor: '#635654', 
    borderRadius: ASTEROID_SIZE / 2, 
    borderWidth: 3,
    borderColor: '#3D3332', 
  },
  crater: {
    position: 'absolute',
    backgroundColor: '#2E2524', 
    borderRadius: 100,
  },
  craterGiant: {
    width: 26,
    height: 26,
  },
  craterLarge: {
    width: 18,
    height: 18,
  },
  craterMedium: {
    width: 12,
    height: 12,
  },
  spaceshipContainer: {
    position: 'absolute',
    width: SHIP_WIDTH,
    height: SHIP_HEIGHT,
    alignItems: 'center',
  },
  noseCone: {
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#00F5D4',
  },
  fuselage: {
    width: 20,
    height: 26,
    backgroundColor: '#4EA8DE',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    zIndex: 2,
  },
  leftStabilizer: {
    position: 'absolute',
    bottom: 0,
    left: 4,
    width: 8,
    height: 16,
    backgroundColor: '#7209B7',
    borderTopLeftRadius: 6,
    transform: [{ rotate: '-12deg' }],
  },
  rightStabilizer: {
    position: 'absolute',
    bottom: 0,
    right: 4,
    width: 8,
    height: 16,
    backgroundColor: '#7209B7',
    borderTopRightRadius: 6,
    transform: [{ rotate: '12deg' }],
  },
  controlPanel: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 25,
  },
  actionButton: {
    backgroundColor: '#12122C',
    borderColor: '#FF0055',
    borderWidth: 1.5,
    paddingVertical: 15,
    borderRadius: 12,
    width: '46%',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 1,
  },
  gameOverOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 7, 20, 0.95)',
    height: '100%',
    width: '100%',
  },
  failedText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FF0055',
    letterSpacing: 2,
    marginBottom: 5,
  },
  finalScoreText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 5,
  },
  bestRecordText: {
    fontSize: 16,
    color: '#707099',
    marginBottom: 35,
  },
  newRecordNotice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFE600',
    marginBottom: 35,
  },
  restartBtn: {
    backgroundColor: '#7209B7',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 25,
  },
  restartBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 2,
  },
});