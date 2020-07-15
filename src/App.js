import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './App.css';
import SimpleMDE from "react-simplemde-editor";
import "easymde/dist/easymde.min.css";
import { faPlus, faFileImport, faSave } from '@fortawesome/free-solid-svg-icons'
import "bootstrap/dist/css/bootstrap.min.css";
import FileSearch from "./components/FileSearch";
import FileList from "./components/FileList";
import BottomBtn from "./components/BottomBtn";
import TabList from "./components/TabList";
import Loader from './components/Loader'
import useIpcRenderer from './hooks/useIpcRenderer'


import { flattenArr, objToArr, timestampToString } from './utils/helper'
import fileHelper from './utils/fileHelper'
import defaultFiles from './utils/defaultFiles.js'

// 加了window之后，webpack不会截获这个引用，不去node_modules里面去找
// require nodejs modules
const { join, basename, extname, dirname } = window.require('path')
const { remote, ipcRenderer } = window.require('electron')

const Store = window.require('electron-store')
// 保存到json文件
const fileStore = new Store({ "name": "Files Data" })
const settingsStore = new Store({ name: 'Settings' })
// 参数填写完整，可同步到七牛云
const getAutoSync = () => ['accessKey', 'secretKey', 'bucketName', 'enableAutoSync'].every(key => !!settingsStore.get(key))


// fileStore.delete('files')
// schema:能对数据类型和数据结构进行验证
// store.set('name', 'viking')  
// store.delete('name')
// store.get('name')

// 新建-重命名-删除的时候，进行数据持久化操作,文件保存到数据文件的字段信息
const saveFilesToStore = (files) => {
  // don't have to store any info in file
  const filesStoreObj = objToArr(files).reduce((result, file) => {
    const { id, path, title, createdAt, isSynced, updatedAt } = file
    result[id] = {
      id,
      path,
      title,
      createdAt,
      isSynced,
      updatedAt
    }
    return result
  }, {})
  fileStore.set('files', filesStoreObj)
}

function App() {
  const [files, setFiles] = useState(fileStore.get('files') || {}) // 文件列表
  const [activeFileID, setActiveFileID] = useState('') // 当前打开的文件
  const [openedFileIDs, setOpenedFileIDs] = useState([]) // 打开了哪些文件
  const [unsavedFileIDs, setUnsavedFileIDs] = useState([]) // 未保存的文件
  const [searchedFiles, setSearchedFiles] = useState([]) // 搜索匹配的文件
  const [isLoading, setLoading] = useState(false) // 是否在加载中
  const savedLocation = settingsStore.get('savedFileLocation') || remote.app.getPath('documents')

  const filesArr = objToArr(files) // 文件列表
  // const savedLocation = settingsStore.get('savedFileLocation') || remote.app.getPath('documents')
  const activeFile = files[activeFileID] // 当前打开的文件
  const openedFiles = openedFileIDs.map(openID => {
    return files[openID]
  })
  const fileListArr = (searchedFiles.length > 0) ? searchedFiles : filesArr



  const fileClick = (fileID) => {
    // set current active file 
    setActiveFileID(fileID)
    const currentFile = files[fileID]
    console.log('fileClick', currentFile)
    const { id, title, path, isLoaded } = currentFile
    if (!isLoaded) {
      if (getAutoSync()) {
        // 开启了自动同步
        ipcRenderer.send('download-file', { key: `${title}.md`, path, id })
      } else {
        // 未开启自动同步保存到本地
        fileHelper.readFile(currentFile.path).then(value => {
          const newFile = { ...files[fileID], body: value, isLoaded: true }
          setFiles({ ...files, [fileID]: newFile })
        })
      }
    }
    console.log('openedFileIDs', openedFileIDs)
    // if openedFiles don't have the current ID
    // then add new fileID to openedFiles
    if (!openedFileIDs.includes(id)) {
      setOpenedFileIDs([...openedFileIDs, id])
    }
  }

  const deleteFile = (id) => {
    if (files[id].isNew) {
      // 新建未保存的文件，直接从数据中删除
      const { [id]: value, ...afterDelete } = files
      setFiles(afterDelete)
    } else {
      // 已经保存创建过的文件从持久化数据中删除
      fileHelper.deleteFile(files[id].path).then(() => {
        const { [id]: value, ...afterDelete } = files
        setFiles(afterDelete)
        saveFilesToStore(afterDelete)
        // close the tab if opened
        tabClose(id)
      })
    }
  }

  // isNew:区分是新建文件，还是文件重命名
  const updateFileName = (id, title, isNew) => {
    // newPath should be different based on isNew 
    // if isNew is false, path should be old ddirname + new title 
    const newPath = isNew ? join(savedLocation, `${title}.md`)
      : join(dirname(files[id].path), `${title}.md`)
    console.log()
    const modifiedFile = { ...files[id], title, isNew: false, path: newPath }
    const newFiles = { ...files, [id]: modifiedFile }
    // 旧的文件更新，新文件创建
    if (isNew) {
      fileHelper.writeFile(newPath, files[id].body).then((err, res) => {
        setFiles(newFiles)
        saveFilesToStore(newFiles)
      })
    } else {
      const oldPath = files[id].path
      fileHelper.renameFile(oldPath, newPath).then(() => {
        setFiles(newFiles)
        saveFilesToStore(newFiles)
      })
    }

  }

  // tab相关擦耦走
  const tabClick = (fileID) => {
    // set current active file
    setActiveFileID(fileID)
  }
  const tabClose = (id) => {
    console.log(id, 'id', 'activeFileID', activeFileID)
    //remove current id from openedFileIDs
    const tabsWithout = openedFileIDs.filter(fileID => fileID !== id)
    setOpenedFileIDs(tabsWithout)
    // set the active to the first opened tab if still tabs left
    if (tabsWithout.length > 0) {
      // 删除的文件就是正打开的文件
      if (activeFileID === id) {
        setActiveFileID(tabsWithout[0])
      }
    } else {
      setActiveFileID('')
    }
  }

  const fileChange = (id, value) => {
    if (value != files[id].body) {
      const newFile = { ...files[id], body: value }
      setFiles({ ...files, [id]: newFile })
      // update unsavedIDs
      if (!unsavedFileIDs.includes(id)) {
        setUnsavedFileIDs([...unsavedFileIDs, id])
      }
    }
  }

  const createNewFile = () => {
    const newID = uuidv4()
    const newFile = {
      id: newID,
      title: '',
      body: '## 请输出 Markdown',
      createdAt: new Date().getTime(),
      isNew: true,
    }
    setFiles({ ...files, [newID]: newFile })
  }

  const saveCurrentFile = () => {
    const { path, body, title } = activeFile
    fileHelper.writeFile(
      path, body
      // join(dirname(activeFile.path) || savedLocation, `${activeFile.title}.md`), activeFile.body
    ).then(() => {
      setUnsavedFileIDs(unsavedFileIDs.filter(id => id !== activeFile.id))
      // 自动云同步
      if (getAutoSync()) {
        console.log('自动开启云同步....', getAutoSync())
        ipcRenderer.send('upload-file', { key: `${title}.md`, path })
      }
    })
  }
  const importFiles = () => {
    console.log('点击了导入按钮')
    remote.dialog.showOpenDialog({
      title: '选择导入的 Markdown 文件',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Markdown files', extensions: ['md'] }
      ]
    }).then(result => {
      const { filePaths, canceled } = result
      console.log(result.canceled)
      console.log(result.filePaths)
      if (Array.isArray(filePaths) && filePaths.length > 0) {
        // filter out the path we already have in electron store
        // ["/Users/ liusha/Desktop/name1.md", "/Users/liusha/Desktop/name2.md"]
        const filteredPaths = filePaths.filter(path => {
          const alreadyAdded = Object.values(files).find(file => file.path === path)
          return !alreadyAdded
        })
        // extend the path array to an array contains files info
        // [{id: '1', path: '', title: ''}, {}]
        const importFilesArr = filteredPaths.map(path => {
          return {
            id: uuidv4(),
            // 文件名：文件去掉后缀名
            title: basename(path, extname(path)),
            path,
          }
        })
        // get the new files object in flattenArr
        const newFiles = { ...files, ...flattenArr(importFilesArr) }
        setFiles(newFiles)
        saveFilesToStore(newFiles)
        if (importFilesArr.length > 0) {
          remote.dialog.showMessageBox({
            type: 'info',
            title: `成功导入了${importFilesArr.length}个文件`,
            message: `成功导入了${importFilesArr.length}个文件`
          })
        }
      }
    }).catch(err => {
      console.log(err)
    })
  }
  const activeFileUploaded = () => {
    const { id } = activeFile
    const modifiedFile = { ...files[id], isSynced: true, updatedAt: new Date().getTime() }
    const newFiles = { ...files, [id]: modifiedFile }
    setFiles(newFiles)
    saveFilesToStore(newFiles)
  }
  const activeFileDownloaded = (event, message) => {
    const currentFile = files[message.id]
    const { id, path } = currentFile
    fileHelper.readFile(path).then(value => {
      let newFile
      if (message.status === 'download-success') {
        // 云空间下载成功
        newFile = { ...files[id], body: value, isLoaded: true, isSynced: true, updatedAt: new Date().getTime() }
      } else {
        // no-new-file：没有需要
        newFile = { ...files[id], body: value, isLoaded: true }
      }
      const newFiles = { ...files, [id]: newFile }
      setFiles(newFiles)
      saveFilesToStore(newFiles)
    })
  }
  const filesUploaded = () => {
    const newFiles = objToArr(files).reduce((result, file) => {
      const currentTime = new Date().getTime()
      result[file.id] = {
        ...files[file.id],
        isSynced: true,
        updatedAt: currentTime,
      }
      return result
    }, {})
    setFiles(newFiles)
    saveFilesToStore(newFiles)
  }
  useIpcRenderer({
    'create-new-file': createNewFile,
    'import-file': importFiles,
    'save-edit-file': saveCurrentFile,
    'active-file-uploaded': activeFileUploaded,
    'file-downloaded': activeFileDownloaded,
    'files-uploaded': filesUploaded,
    'loading-status': (message, status) => { setLoading(status) }
  })
  // useEffect(() => {
  //   const callback = () => {
  //     console.log('hello from menu')
  //   }
  //   ipcRenderer.on('create-new-file', callback)
  //   return () => {
  //     ipcRenderer.removeListener('create-new-file', callback)
  //   }
  // }, [])
  return (
    <div className="App container-fluid px-0">
      {isLoading &&
        <Loader />
      }
      {/* 栅格布局 */}
      <div className="row no-gutters">
        {/* 左右俩栏布局 */}
        <div className="col-3 left-panel">
          {/* 文件搜索 */}
          <FileSearch
            // title="我的云文档"
            onFileSearch={(val) => { console.log('调用搜索---onFileSearch') }}
          />
          <FileList
            files={filesArr}
            onFileClick={fileClick}
            onFileDelete={deleteFile}
            onSaveEdit={updateFileName}
          />
          <div className="row no-gutters button-group">
            <div className="col">
              <BottomBtn
                text="新建"
                colorClass="btn-primary"
                icon={faPlus}
                onBtnClick={createNewFile}
              />
            </div>
            <div className="col">
              <BottomBtn
                text="导入"
                colorClass="btn-success"
                icon={faFileImport}
                onBtnClick={importFiles}
              />
            </div>
          </div>

        </div>
        <div className="col-9 right-panel">
          {!activeFile &&
            <div className="start-page">
              选择或者创建新的 Markdown 文档
            </div>
          }
          {activeFile &&
            <>
              <TabList
                files={openedFiles}
                activeId={activeFileID}
                unsaveIds={unsavedFileIDs}
                onTabClick={tabClick}
                onCloseTab={tabClose}
              />
              <SimpleMDE
                key={activeFile && activeFile.id}
                value={activeFile && activeFile.body}
                onChange={(value) => { fileChange(activeFile.id, value) }}
                options={{
                  minHeight: '515px',
                }}
              />
              {/* <BottomBtn
                text="保存"
                colorClass="btn-success"
                icon={faSave}
                // onBtnClick={saveCurrentFile}
                onBtnClick={() => { ipcRenderer.send('message', 'hello from renderer') }}

              /> */}
              {activeFile.isSynced &&
                <span className="sync-status">已同步，上次同步{timestampToString(activeFile.updatedAt)}</span>
              }
            </>
          }
        </div>
      </div>
    </div >
  );
}

export default App;
