import React, { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes, faTrash, faEdit } from '@fortawesome/free-solid-svg-icons'
import { faMarkdown } from '@fortawesome/free-brands-svg-icons'
import PropTypes from 'prop-types'
import useKeyPress from '../../hooks/useKeyPress'
import useContextMenu from '../../hooks/useContextMenu'
import { getParentNode } from '../../utils/helper'
const { remote } = window.require('electron')
const { Menu, MenuItem } = remote

const FileList = ({ files, onFileClick, onSaveEdit, onFileDelete }) => {
  // 编辑了某一个
  const [editStatus, setEditStatus] = useState(false)
  // 重命名的名称
  const [value, setValue] = useState('')
  // 编辑输入框的实例,如果一次展示多个输入框，这样使用是bug
  let node = useRef(null)
  // 键盘操作ok和取消
  const enterPressed = useKeyPress(13)
  const escPressed = useKeyPress(27)


  // 关闭编辑输入框
  const closeSearch = (editItem) => {
    setEditStatus(false)
    setValue('')
    // if we are editing a newly created file, we should delete this file when pressing esc
    if (editItem.isNew) {
      // 新建的直接删除掉
      onFileDelete(editItem.id)
    }

  }
  // 上下文菜单
  const clickedItem = useContextMenu([
    {
      label: '打开',
      click: () => {
        console.log('clickedItem', clickedItem)
        const parentElement = getParentNode(clickedItem.current, 'file-item')
        if (parentElement) {
          onFileClick(parentElement.dataset.id)
        }
      }
    },
    {
      label: '重命名',
      click: () => {
        const parentElement = getParentNode(clickedItem.current, 'file-item')
        if (parentElement) {
          const { id, title } = parentElement.dataset
          setEditStatus(id)
          setValue(title)
        }
      }
    },
    {
      label: '删除',
      click: () => {
        const parentElement = getParentNode(clickedItem.current, 'file-item')
        if (parentElement) {
          onFileDelete(parentElement.dataset.id)
        }
      }
    },
  ], '.file-list', [files])



  // 文件命名的保存
  useEffect(() => {
    const editItem = files.find(file => file.id === editStatus)
    // Effect通过直接判断变量的值，事件hooks改变变量值，引起的重新渲染执行Effect，
    console.log('enterPressed', enterPressed, 'editStatus', editStatus)
    if (enterPressed && editStatus && value.trim() !== '') {
      onSaveEdit(editItem.id, value, editItem.isNew)
      setEditStatus(false)
      setValue('')
    }
    if (escPressed && editStatus) {
      closeSearch(editItem)
    }
  })
  // 新建的文件，直接是编辑状态
  useEffect(() => {
    const newFile = files.find(file => file.isNew)
    if (newFile) {
      setEditStatus(newFile.id)
      setValue(newFile.title)
    }
  }, [files])
  // 输入框的聚焦
  useEffect(() => {
    if (editStatus) {
      node.current.focus()
    }
  }, [editStatus])
  return (
    <ul className="list-group list-group-flush file-list left-menu-list">
      {
        files.map(file => (
          <li
            className="list-group-item bg-light row d-flex align-items-center file-item mx-0"
            key={file.id}
            data-id={file.id}
            data-title={file.title}
          >
            {/* 文件标题 */}
            {(file.id !== editStatus && !file.isNew) &&
              <>
                <span className="col-2">
                  <FontAwesomeIcon
                    size="lg"
                    icon={faMarkdown}
                  />
                </span>
                <span
                  className="col-10 c-link"
                  onClick={() => { onFileClick(file.id) }}
                >
                  {file.title}
                  {/* <button
                    type="button"
                    className="icon-button"
                    onClick={() => {
                      setEditStatus(file.id)
                      setValue(file.title)
                    }}
                  >
                    <FontAwesomeIcon
                      title="编辑"
                      size="lg"
                      icon={faEdit}
                    />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => onFileDelete(file.id)}
                  >
                    <FontAwesomeIcon
                      title="删除"
                      size="lg"
                      icon={faTrash}
                    />
                  </button> */}
                </span>
              </>
            }

            {/* 文件名编辑 */}
            {((file.id === editStatus) || file.isNew) &&
              <>
                <input
                  className="form-control col-10"
                  ref={node}
                  value={value}
                  placeholder="请输入文件名称"
                  onChange={(e) => { setValue(e.target.value) }}
                />
                <button
                  type="button"
                  className="icon-button col-2"
                  onClick={() => { closeSearch(file) }}
                >
                  <FontAwesomeIcon
                    title="关闭"
                    size="lg"
                    icon={faTimes}
                  />
                </button>
              </>

            }
          </li>
        ))
      }
    </ul>
  )
}

FileList.propTypes = {
  files: PropTypes.array,
  onFileClick: PropTypes.func,
  onFileDelete: PropTypes.func,
  onSaveEdit: PropTypes.func,
}
export default FileList