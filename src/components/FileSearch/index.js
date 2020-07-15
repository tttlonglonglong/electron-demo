import React, { Fragment, useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons'
import PropTypes from 'prop-types'

import useKeyPress from '../../hooks/useKeyPress' // 用户按键相关的hooks
// import useIpcRenderer from '../hooks/useIpcRenderer'



const FileSearch = ({ title, onFileSearch }) => {
  // 是否显示输入框
  const [inputActive, setInputActive] = useState(false)
  // input输入框的值
  const [value, setValue] = useState('')
  // 监听搜索的key事件，这里相当于监听了俩次事件：enter和esc
  const enterPressed = useKeyPress(13)
  const escPressed = useKeyPress(27)
  // 获取input标签的原生dom元素
  let node = useRef(null)

  // 点击搜索按钮开始搜索
  const startSearch = () => {
    setInputActive(true)
  }
  const closeSearch = () => {
    setInputActive(false)
    // 清空搜索框
    setValue('')
    // 关闭搜索，显示默认默认文件列表
    onFileSearch(false)
  }
  // 通信
  // useIpcRenderer({
  //   'search-file': startSearch
  // })
  // 搜索的触发---因为hooks中的state的变化，会引起组件的重新渲染，每次渲染都会触发
  useEffect(() => {
    if (enterPressed && inputActive) {
      onFileSearch(value)
    }
  }, [enterPressed])
  // // 输入框的聚焦
  useEffect(() => {
    if (inputActive) {
      node.current.focus()
    }
  }, [inputActive])
  return (
    <div className="alert alert-primary d-flex justify-content-between align-items-center mb-0">
      {!inputActive &&
        <>
          <span>{title}</span>
          <button
            type="button"
            className="icon-button"
            onClick={startSearch}
          >
            <FontAwesomeIcon
              title="搜索"
              // size="lg"
              icon={faSearch}
            />
          </button>
        </>
      }
      {inputActive &&
        <>
          <input
            className="form-control"
            value={value}
            ref={node}
            onChange={(e) => { setValue(e.target.value) }}
          />
          <button
            type="button"
            className="icon-button"
            onClick={closeSearch}
          >
            <FontAwesomeIcon
              title="关闭"
              size="lg"
              icon={faTimes}
            />
          </button>
        </>
      }
    </div>
  )
}


FileSearch.propTypes = {
  title: PropTypes.string,
  onFileSearch: PropTypes.func.isRequired
}

FileSearch.defaultProps = {
  title: '我的云文档'
}
export default FileSearch