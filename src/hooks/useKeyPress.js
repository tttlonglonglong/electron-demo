
import { useEffect, useState } from "react";

// 监听key事件
// # 优化：输入框未出现时，监听的事件直接返回，不操作
const useKeyPress = (targetKeyCode) => {
  const [keyPressed, setKeyPressed] = useState(false)

  const keyDownHandler = ({ keyCode }) => {
    if (keyCode === targetKeyCode) {
      setKeyPressed(true)
    }
  }
  const keyUpHandler = ({ keyCode }) => {
    if (keyCode === targetKeyCode) {
      setKeyPressed(false)
    }
  }
  useEffect(() => {
    window.addEventListener('keydown', keyDownHandler)
    window.addEventListener('keyup', keyUpHandler)
    return () => {
      window.removeEventListener('keydown', keyDownHandler)
      window.removeEventListener('keyup', keyUpHandler)
    }
  }, [])
  return keyPressed
}

export default useKeyPress