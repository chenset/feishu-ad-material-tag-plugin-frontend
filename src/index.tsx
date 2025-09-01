import React, { useEffect, useState } from 'react'
import './css/index.css'
import ReactDOM from 'react-dom/client'
import { bitable, FieldType, IAttachmentField, IAttachmentFieldMeta, IMultiSelectField, IMultiSelectFieldMeta, ISingleSelectField, ISingleSelectFieldMeta, ITextField, ITextFieldMeta } from '@lark-base-open/js-sdk';
import { AlertProps, Button, Select, Modal } from 'antd';
import { toByteArray, fromByteArray } from 'base64-js';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LoadApp />
  </React.StrictMode>
)

function LoadApp() {
  //cache the selected value
  const selectDefaultValueKey = 'selectField_v1'
  var cacheSelectVal = JSON.parse(localStorage.getItem(selectDefaultValueKey) || "{}") || {}

  const [info, setInfo] = useState('get table name, please waiting ....');
  const [alertType, setAlertType] = useState<AlertProps['type']>('info');
  const [loading, setLoading] = useState(false);

  // Add a new state for logs
  const [logs, setLogs] = useState<{ recordId: string, index: number, time: string, status: string, message: string, total?: number }[]>([]);

  const [attachmentFieldMetaList, setAttachmentMetaList] = useState<IAttachmentFieldMeta[]>([])
  const [multiSelectFieldMetaList, setMultiSelectMetaList] = useState<IMultiSelectFieldMeta[]>([]);
  const [singleSelectFieldMetaList, setSingleSelectMetaList] = useState<ISingleSelectFieldMeta[]>([]);
  const [textFieldMetaList, setTextMetaList] = useState<ITextFieldMeta[]>([]);

  const [selectAttachmentField, setSelectAttachmentField] = useState<string>(cacheSelectVal['attachment'] || '');
  const [selectElementField, setSelectElementField] = useState<string>(cacheSelectVal['element'] || '');
  const [selectStyleField, setSelectStyleField] = useState<string>(cacheSelectVal['style'] || '');
  const [selectThemeField, setSelectThemeField] = useState<string>(cacheSelectVal['theme'] || '');
  const [selectCopywritingField, setSelectCopywritingField] = useState<string>(cacheSelectVal['copywriting'] || '');
  const [selectVisualSubjectField, setSelectVisualSubjectField] = useState<string>(cacheSelectVal['visualSubject'] || '');
  const [selectPresentationTypeField, setSelectPresentationTypeField] = useState<string>(cacheSelectVal['presentationType'] || '');
  const [selectCoreHighlightField, setSelectCoreHighlightField] = useState<string>(cacheSelectVal['coreHighlight'] || '');

  // Add state for keywords
  const [picPrompt, setPicPrompt] = useState<string>(localStorage.getItem('picPrompt') || '');
  const [vidPrompt, setVidPrompt] = useState<string>(localStorage.getItem('vidPrompt') || '');

  // Add state for custom API URL
  const [customApiUrl, setCustomApiUrl] = useState<string>(localStorage.getItem('customApiUrl') || 'https://feishu-g-plugin-zacgffzypr.cn-shenzhen.fcapp.run/feishu-ad-material-tag-plugin/image-tag');

  // Function to handle custom API URL changes
  const handleCustomApiUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setCustomApiUrl(newUrl);
    localStorage.setItem('customApiUrl', newUrl);
  };

  // Function to handle keyword changes
  const handlePicPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    setPicPrompt(newPrompt);
    localStorage.setItem('picPrompt', newPrompt);
  };

  const handleVidPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    setVidPrompt(newPrompt);
    localStorage.setItem('vidPrompt', newPrompt);
  };

  useEffect(() => {
    const fn = async () => {
      const table = await bitable.base.getActiveTable();
      const tableName = await table.getName();
      setInfo(`The table Name is ${tableName}`);
      setAlertType('success');
      const fieldAttachmenetMetaList = await table.getFieldMetaListByType<IAttachmentFieldMeta>(FieldType.Attachment);
      setAttachmentMetaList(fieldAttachmenetMetaList);
      const fieldMultiSelectMetaList = await table.getFieldMetaListByType<IMultiSelectFieldMeta>(FieldType.MultiSelect);
      setMultiSelectMetaList(fieldMultiSelectMetaList);
      const fieldSingleSelectMetaList = await table.getFieldMetaListByType<ISingleSelectFieldMeta>(FieldType.SingleSelect);
      setSingleSelectMetaList(fieldSingleSelectMetaList);
      const fieldTextMetaList = await table.getFieldMetaListByType<ITextFieldMeta>(FieldType.Text);
      setTextMetaList(fieldTextMetaList);
    };
    fn();
  }, []);

  const formatFieldAttachmentMetaList = (metaList: IAttachmentFieldMeta[]) => {
    return metaList.map(meta => ({ label: meta.name, value: meta.id }));
  };
  const formatFieldMultiSelectMetaList = (metaList: IMultiSelectFieldMeta[]) => {
    return metaList.map(meta => ({ label: meta.name, value: meta.id }));
  };
  const formatFieldSingleSelectMetaList = (metaList: ISingleSelectFieldMeta[]) => {
    return metaList.map(meta => ({ label: meta.name, value: meta.id }));
  };
  const formatFieldTextMetaList = (metaList: ITextFieldMeta[]) => {
    return metaList.map(meta => ({ label: meta.name, value: meta.id }));
  };

  const submit = async () => {
    // Clear previous logs
    setLogs([]);

    // update selected value cache
    cacheSelectVal['attachment'] = selectAttachmentField
    cacheSelectVal['element'] = selectElementField
    cacheSelectVal['style'] = selectStyleField
    cacheSelectVal['theme'] = selectThemeField
    cacheSelectVal['copywriting'] = selectCopywritingField
    cacheSelectVal['visualSubject'] = selectVisualSubjectField
    cacheSelectVal['presentationType'] = selectPresentationTypeField
    cacheSelectVal['coreHighlight'] = selectCoreHighlightField
    localStorage.setItem(selectDefaultValueKey, JSON.stringify(cacheSelectVal))

    if (!selectAttachmentField) {
      Modal.warning({ title: '提示', content: '请选择图片字段', });
      return;
    }
    if (!selectElementField && !selectStyleField && !selectThemeField && !selectCopywritingField && !selectVisualSubjectField && !selectPresentationTypeField && !selectCoreHighlightField) {
      Modal.warning({ title: '提示', content: '元素、风格、题材、文案、视觉主体、呈现型、核心突出点至少选择一个', });
      return;
    }
    //选择的字段
    const table = await bitable.base.getActiveTable();
    const attachmentField = await table.getField<IAttachmentField>(selectAttachmentField);
    const elementField = selectElementField ? await table.getField<IMultiSelectField>(selectElementField) : null;
    const styleField = selectStyleField ? await table.getField<IMultiSelectField>(selectStyleField) : null;
    const themeField = selectThemeField ? await table.getField<IMultiSelectField>(selectThemeField) : null;
    const copywritingField = selectCopywritingField ? await table.getField<ITextField>(selectCopywritingField) : null;
    const visualSubjectField = selectVisualSubjectField ? await table.getField<IMultiSelectField>(selectVisualSubjectField) : null;
    const presentationTypeField = selectPresentationTypeField ? await table.getField<IMultiSelectField>(selectPresentationTypeField) : null;
    const coreHighlightField = selectCoreHighlightField ? await table.getField<IMultiSelectField>(selectCoreHighlightField) : null;
    //获取选择的视图
    const selection = await bitable.base.getSelection();
    const activeViewId = selection.viewId;
    // 由于 activeViewId 可能为 null，需要做非空判断
    if (!activeViewId) {
      Modal.warning({ title: '提示', content: '视图不存在', });
      return;
    }
    const view = table.getViewById(activeViewId);
    const recordIdList = await (await view).getVisibleRecordIdList();
    const totalRecords = recordIdList.length;

    // 开始加载
    setLoading(true);
    let skipItems = 0;
    let failedItems = 0;
    try {
      //遍历每一行
      for (let i = 0; i < recordIdList.length; i++) {
        const recordId = recordIdList[i];
        if (!recordId) {
          continue;
        }
        //是否选择的字段已经存在了元素，选择的字段都有值则不会调用api
        let needCallApi = false;
        //选择字段对应行的值
        let elementVal = null;
        if (elementField) {
          elementVal = await elementField.getValue(recordId);
          if (elementVal === null) {
            needCallApi = true;
          }
        }
        let styleVal = null;
        if (styleField) {
          styleVal = await styleField.getValue(recordId);
          if (styleVal === null) {
            needCallApi = true;
          }
        }
        let themeVal = null;
        if (themeField) {
          themeVal = await themeField.getValue(recordId);
          if (themeVal === null) {
            needCallApi = true;
          }
        }
        let copywritingVal = null;
        if (copywritingField) {
          copywritingVal = await copywritingField.getValue(recordId);
          if (copywritingVal === null) {
            needCallApi = true;
          }
        }
        let visualSubjectVal = null;
        if (visualSubjectField) {
          visualSubjectVal = await visualSubjectField.getValue(recordId);
          if (visualSubjectVal === null) {
            needCallApi = true;
          }
        }
        let presentationTypeVal = null;
        if (presentationTypeField) {
          presentationTypeVal = await presentationTypeField.getValue(recordId);
          if (presentationTypeVal === null) {
            needCallApi = true;
          }
        }
        let coreHighlightVal = null;
        if (coreHighlightField) {
          coreHighlightVal = await coreHighlightField.getValue(recordId);
          if (coreHighlightVal === null) {
            needCallApi = true;
          }
        }
        //是否选择的字段已经存在了元素，选择的字段都有值则不会调用api
        if (!needCallApi) {
          skipItems++;
          setLogs(prev => [...prev, {
            recordId,
            index: i + 1,
            time: new Date().toLocaleTimeString(),
            status: 'skipped',
            message: '字段已有值, 跳过',
            total: totalRecords
          }]);
          continue;
        }

        //附件字段是否存在
        const val = await attachmentField.getValue(recordId);
        if (null === val || val.length === 0 || !val) {
          skipItems++;
          setLogs(prev => [...prev, {
            recordId,
            index: i + 1,
            time: new Date().toLocaleTimeString(),
            status: 'skipped',
            message: '无附件',
            total: totalRecords
          }]);
          continue;
        }
        //附件字段是否包含非图片附件
        const containNonImage = val.some(file => !file.type.startsWith('image/') && !file.type.startsWith('video/'));
        if (containNonImage) {
          skipItems++;
          setLogs(prev => [...prev, {
            recordId,
            index: i + 1,
            time: new Date().toLocaleTimeString(),
            status: 'skipped',
            message: '此功能目前仅支持提取图片类型的附件',
            total: totalRecords
          }]);
          continue;
        }
        //获取附件的url
        const urls = await attachmentField.getAttachmentUrls(recordId);
        if (null === urls || urls.length === 0) {
          skipItems++;
          setLogs(prev => [...prev, {
            recordId,
            index: i + 1,
            time: new Date().toLocaleTimeString(),
            status: 'skipped',
            message: '无附件URL',
            total: totalRecords
          }]);
          continue;
        }

        // 记录开始处理的日志
        setLogs(prev => [...prev, {
          recordId,
          index: i + 1,
          time: new Date().toLocaleTimeString(),
          status: 'processing',
          message: '开始处理',
          total: totalRecords
        }]);
        const startTime = new Date();

        //调用第三方API
        try {
          const result = await jsonpRequest(customApiUrl, {
            files: urls,
            recordId: recordId,
            tableId: table.id,
            picPrompt: picPrompt,
            vidPrompt: vidPrompt
          });
          // 计算耗时
          const duration = (new Date().getTime() - startTime.getTime()) / 1000;
          // 记录处理成功的日志
          if(result.resultCode && result.resultCode === 1) {
            // 将响应结果写入复选框
            const data = result.data;
            if (data) {
              if (elementField && elementVal === null) {
                await elementField.setValue(recordId, Array.isArray(data.elementList) ? data.elementList.filter((element: any, i: any) => i === data.elementList.indexOf(element)) : []);
              }
              if (styleField && styleVal === null) {
                await styleField.setValue(recordId, Array.isArray(data.styleList) ? data.styleList.filter((element: any, i: any) => i === data.styleList.indexOf(element)) : []);
              }
              if (themeField && themeVal === null) {
                await themeField.setValue(recordId, Array.isArray(data.themeList) ? data.themeList.filter((element: any, i: any) => i === data.themeList.indexOf(element)) : []);
              }
              if (copywritingField && copywritingVal === null) {
                await copywritingField.setValue(recordId, Array.isArray(data.copyWritingList) ? JSON.stringify(data.copyWritingList) : '');
              }
              if (visualSubjectField && visualSubjectVal === null) {
                await visualSubjectField.setValue(recordId, Array.isArray(data.visualSubjectList) ? data.visualSubjectList.filter((element: any, i: any) => i === data.visualSubjectList.indexOf(element)) : []);
              }
              if (presentationTypeField && presentationTypeVal === null) {
                await presentationTypeField.setValue(recordId, Array.isArray(data.presentationTypeList) ? data.presentationTypeList.filter((element: any, i: any) => i === data.presentationTypeList.indexOf(element)) : []);
              }
              if (coreHighlightField && coreHighlightVal === null) {
                await coreHighlightField.setValue(recordId, Array.isArray(data.coreHighlightList) ? data.coreHighlightList.filter((element: any, i: any) => i === data.coreHighlightList.indexOf(element)) : []);
              }
            }
            setLogs(prev => [...prev, {
              recordId,
              index: i + 1,
              time: new Date().toLocaleTimeString(),
              status: 'success',
              message: `处理完成 (耗时: ${duration.toFixed(2)}秒)` + (result.msg ? `: ${result.msg}` : ''),
              total: totalRecords
            }]);
          } else {
            failedItems++;
            console.error('API调用结果失败:', result);
            setLogs(prev => [...prev, {
              recordId,
              index: i + 1,
              time: new Date().toLocaleTimeString(),
              status:'error',
              message: `处理失败 (耗时: ${duration.toFixed(2)}秒): ${result.msg}`,
              total: totalRecords
            }]);
          }
        } catch (error) {
          failedItems++;
          console.error('API调用失败:', error);
          //耗时
          const duration = (new Date().getTime() - startTime.getTime()) / 1000;
          // 记录处理失败的日志
          setLogs(prev => [...prev, {
            recordId,
            index: i + 1,
            time: new Date().toLocaleTimeString(),
            status: 'error',
            message: `处理失败 (耗时: ${duration.toFixed(2)}秒): ${error instanceof Error ? error.message : String(error)}`,
            total: totalRecords
          }]);
        }
      }
    } finally {
      if (skipItems === recordIdList.length) {
        Modal.warning({ title: '提示', content: '没有需要处理的行', });
      } else {
        Modal.info({ title: '提示', content: `${totalRecords} 行处理完成, ${skipItems} 行跳过, ${failedItems} 行失败, ${totalRecords - skipItems - failedItems}行成功`, });
      }
      // 结束加载
      setLoading(false);
    }
  };

  // Add a ref for the log container
  const logContainerRef = React.useRef<HTMLDivElement>(null);

  // Add effect to scroll to bottom when logs change
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return <div style={{
    minHeight: '100vh',
    padding: '20px 0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  }}>

    <div style={{ 
      maxWidth: 400, 
      margin: '0 auto', 
      textAlign: 'left',
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '16px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      padding: '24px'
    }}>

      <div style={{ marginBottom: 20 }}>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: '600', 
          color: '#2c3e50', 
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center'
        }}>
          📎 请选择图片所在字段
        </div>
        <Select 
          style={{ width: '100%', borderRadius: '8px' }} 
          allowClear={true} 
          value={selectAttachmentField} 
          onSelect={setSelectAttachmentField} 
          onClear={() => setSelectAttachmentField('')} 
          options={formatFieldAttachmentMetaList(attachmentFieldMetaList)}
          placeholder="选择图片字段"
        />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: '600', 
          color: '#2c3e50', 
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center'
        }}>
          🖼️ 图片关键词
        </div>
        <textarea
          value={picPrompt}
          onChange={handlePicPromptChange}
          style={{
            width: '100%',
            height: '480px',
            padding: '12px',
            fontSize: '14px',
            border: '2px solid #e3f2fd',
            borderRadius: '8px',
            boxSizing: 'border-box',
            resize: 'vertical',
            fontFamily: 'inherit',
            backgroundColor: '#fafbfc',
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
          placeholder="请输入图片关键词（支持多行输入）..."
          onFocus={(e) => e.target.style.borderColor = '#667eea'}
          onBlur={(e) => e.target.style.borderColor = '#e3f2fd'}
        />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: '600', 
          color: '#2c3e50', 
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center'
        }}>
          🎬 视频关键词
        </div>
        <textarea
          value={vidPrompt}
          onChange={handleVidPromptChange}
          style={{
            width: '100%',
            height: '480px',
            padding: '12px',
            fontSize: '14px',
            border: '2px solid #e3f2fd',
            borderRadius: '8px',
            boxSizing: 'border-box',
            resize: 'vertical',
            fontFamily: 'inherit',
            backgroundColor: '#fafbfc',
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
          placeholder="请输入视频关键词（支持多行输入）..."
          onFocus={(e) => e.target.style.borderColor = '#667eea'}
          onBlur={(e) => e.target.style.borderColor = '#e3f2fd'}
        />
      </div>
      <div style={{ 
        background: 'rgba(102, 126, 234, 0.05)', 
        borderRadius: '12px', 
        padding: '16px', 
        marginBottom: '20px',
        border: '1px solid rgba(102, 126, 234, 0.1)'
      }}>
        <div style={{ 
          fontSize: '16px', 
          fontWeight: '700', 
          color: '#667eea', 
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          🏷️ 标签字段配置
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <div style={{ 
            fontSize: '13px', 
            fontWeight: '600', 
            color: '#2c3e50', 
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center'
          }}>
            🧩 <span style={{ marginLeft: '4px', color: '#ff6b6b' }}>元素</span>标签回写字段
          </div>
          <Select 
            style={{ width: '100%' }} 
            allowClear 
            value={selectElementField} 
            onSelect={setSelectElementField} 
            onClear={() => setSelectElementField('')} 
            options={formatFieldMultiSelectMetaList(multiSelectFieldMetaList)}
            placeholder="选择元素标签字段"
          />
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <div style={{ 
            fontSize: '13px', 
            fontWeight: '600', 
            color: '#2c3e50', 
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center'
          }}>
            🎨 <span style={{ marginLeft: '4px', color: '#4ecdc4' }}>风格</span>标签回写字段
          </div>
          <Select 
            style={{ width: '100%' }} 
            allowClear 
            value={selectStyleField} 
            onSelect={setSelectStyleField} 
            onClear={() => setSelectStyleField('')} 
            options={formatFieldMultiSelectMetaList(multiSelectFieldMetaList)}
            placeholder="选择风格标签字段"
          />
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <div style={{ 
            fontSize: '13px', 
            fontWeight: '600', 
            color: '#2c3e50', 
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center'
          }}>
            📖 <span style={{ marginLeft: '4px', color: '#a29bfe' }}>题材</span>标签回写字段
          </div>
          <Select 
            style={{ width: '100%' }} 
            allowClear 
            value={selectThemeField} 
            onSelect={setSelectThemeField} 
            onClear={() => setSelectThemeField('')} 
            options={formatFieldMultiSelectMetaList(multiSelectFieldMetaList)}
            placeholder="选择题材标签字段"
          />
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <div style={{ 
            fontSize: '13px', 
            fontWeight: '600', 
            color: '#2c3e50', 
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center'
          }}>
            👁️ <span style={{ marginLeft: '4px', color: '#fd79a8' }}>视觉主体</span>标签回写字段
          </div>
          <Select 
            style={{ width: '100%' }} 
            allowClear 
            value={selectVisualSubjectField} 
            onSelect={setSelectVisualSubjectField} 
            onClear={() => setSelectVisualSubjectField('')} 
            options={formatFieldMultiSelectMetaList(multiSelectFieldMetaList)}
            placeholder="选择视觉主体字段"
          />
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <div style={{ 
            fontSize: '13px', 
            fontWeight: '600', 
            color: '#2c3e50', 
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center'
          }}>
            🎭 <span style={{ marginLeft: '4px', color: '#74b9ff' }}>呈现型</span>标签回写字段
          </div>
          <Select 
            style={{ width: '100%' }} 
            allowClear 
            value={selectPresentationTypeField} 
            onSelect={setSelectPresentationTypeField} 
            onClear={() => setSelectPresentationTypeField('')} 
            options={formatFieldMultiSelectMetaList(multiSelectFieldMetaList)}
            placeholder="选择呈现型字段"
          />
        </div>
        
        <div>
          <div style={{ 
            fontSize: '13px', 
            fontWeight: '600', 
            color: '#2c3e50', 
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center'
          }}>
            ⭐ <span style={{ marginLeft: '4px', color: '#fdcb6e' }}>核心突出点</span>标签回写字段
          </div>
          <Select 
            style={{ width: '100%' }} 
            allowClear 
            value={selectCoreHighlightField} 
            onSelect={setSelectCoreHighlightField} 
            onClear={() => setSelectCoreHighlightField('')} 
            options={formatFieldMultiSelectMetaList(multiSelectFieldMetaList)}
            placeholder="选择核心突出点字段"
          />
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 30 }}>
        <Button 
          size="large"
          type="primary" 
          onClick={submit} 
          loading={loading}
          style={{
            width: '100%',
            height: '48px',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              (e.target as HTMLElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLElement).style.boxShadow = '0 12px 30px rgba(102, 126, 234, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.transform = 'translateY(0)';
            (e.target as HTMLElement).style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.3)';
          }}
        >
          {loading ? '🔄 处理中...' : '🚀 执行处理'}
        </Button>
      </div>
    </div>

    {/* 优化后的日志区域 */}
    <div style={{ 
      maxWidth: 400, 
      margin: '20px auto 80px auto', 
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '16px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      padding: '20px'
    }}>
      <div style={{ 
        fontSize: '16px',
        fontWeight: '700',
        color: '#2c3e50',
        marginBottom: '16px',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        📊 处理日志
      </div>
      <div
        ref={logContainerRef}
        style={{
          maxHeight: 250,
          overflowY: 'auto',
          border: '2px solid #f1f3f4',
          padding: 12,
          borderRadius: 12,
          fontSize: '13px',
          backgroundColor: '#fafbfc'
        }}
      >
        {logs.length === 0 ?
          <div style={{ 
            color: '#8e9aaf', 
            textAlign: 'center',
            padding: '20px',
            fontStyle: 'italic'
          }}>
            📝 暂无处理日志
          </div> :
          logs.map((log, index) => (
            <div key={index} style={{
              marginBottom: 8,
              padding: 12,
              backgroundColor: log.status === 'error' ? '#fee7e6' :
                log.status === 'success' ? '#e8f5e8' :
                  log.status === 'processing' ? '#e3f2fd' : '#f5f6fa',
              borderRadius: 8,
              border: `1px solid ${log.status === 'error' ? '#ffcccb' :
                log.status === 'success' ? '#c8e6c9' :
                  log.status === 'processing' ? '#bbdefb' : '#e1e5e9'}`,
              transition: 'all 0.2s ease'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: 4,
                fontSize: '12px'
              }}>
                <span style={{ 
                  color: '#666',
                  marginRight: '8px'
                }}>🕐 {log.time}</span>
                <span style={{ 
                  background: 'rgba(102, 126, 234, 0.1)',
                  color: '#667eea',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  {log.index}/{log.total}
                </span>
                <span style={{
                  marginLeft: '8px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  backgroundColor: log.status === 'error' ? '#f5222d' :
                    log.status === 'success' ? '#52c41a' :
                      log.status === 'processing' ? '#1890ff' : '#8c8c8c',
                  color: 'white'
                }}>
                  {log.status === 'error' ? '❌ 错误' :
                    log.status === 'success' ? '✅ 成功' :
                      log.status === 'processing' ? '⏳ 处理中' : '⏭️ 跳过'}
                </span>
              </div>
              <div style={{ color: '#2c3e50', fontSize: '13px' }}>
                {log.message}
              </div>
            </div>
          ))
        }
      </div>
    </div>

    {/* 优化后的底部API地址输入区域 */}
    <div style={{
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      borderTop: '2px solid rgba(102, 126, 234, 0.2)',
      padding: '12px 20px',
      zIndex: 1000,
      boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ 
        maxWidth: 400,
        margin: '0 auto',
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px'
      }}>
        <label style={{ 
          fontSize: '13px', 
          fontWeight: '600',
          color: '#2c3e50',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center'
        }}>
          🔗 API地址:
        </label>
        <input
          type="text"
          value={customApiUrl}
          onChange={handleCustomApiUrlChange}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '13px',
            border: '2px solid #e3f2fd',
            borderRadius: '8px',
            backgroundColor: '#fafbfc',
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
          placeholder="输入自定义API服务器地址..."
          onFocus={(e) => e.target.style.borderColor = '#667eea'}
          onBlur={(e) => e.target.style.borderColor = '#e3f2fd'}
        />
      </div>
    </div>

  </div>
}

async function jsonpRequest(reqUrl: string, params: Record<string, any>, timeout: number = 200000): Promise<any> {
  return new Promise((resolve, reject) => {
    // 创建随机函数名
    if (!(window as any)._random_fun_create_prefix_incr) {
      (window as any)._random_fun_create_prefix_incr = 0;
    }
    (window as any)._random_fun_create_prefix_incr++;
    const funName: string = 'ras_79_8fa61fSDa62_' + (window as any)._random_fun_create_prefix_incr;

    // 设置全局回调函数
    (window as any)[funName] = (res: any): void => {
      resolve(res);
      cleanup();
    };

    // params 必须是 JSON 对象
    params['fun'] = funName;
    // const base64Str: string = btoa(unescape(encodeURIComponent(JSON.stringify(params))));
    // 将 params 转换为 UTF-8 编码的字节数组
    const textEncoder: TextEncoder = new TextEncoder();
    const paramsBytes: Uint8Array = textEncoder.encode(JSON.stringify(params));
    // 使用 base64-js 进行 Base64 编码
    const base64Str: string = fromByteArray(paramsBytes);
    reqUrl = reqUrl.includes("?")
      ? `${reqUrl}&base64=${base64Str}`
      : `${reqUrl}?base64=${base64Str}`;

    // 创建 script 元素
    const scriptEl: HTMLScriptElement = document.createElement('script');
    scriptEl.src = reqUrl;
    scriptEl.defer = true;
    scriptEl.async = true;

    // 错误处理
    scriptEl.onerror = (err: Event | string): void => {
      reject(new Error(`Script load error: ${err}`));
      cleanup();
    };

    // 添加到文档
    document.getElementsByTagName('head')[0].appendChild(scriptEl);

    // 设置超时
    const timeoutId = setTimeout(() => {
      reject(new Error('HTTP request timeout'));
      cleanup();
    }, timeout);

    // 清理函数：移除 script 元素、回调函数和清除超时
    function cleanup(): void {
      clearTimeout(timeoutId);
      scriptEl.remove();
      delete (window as any)[funName];
    }
  });
}