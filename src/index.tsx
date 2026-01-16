import React, {useEffect, useState} from 'react'
import './css/index.css'
import ReactDOM from 'react-dom/client'
import {
  bitable,
  FieldType,
  IAttachmentField,
  IAttachmentFieldMeta,
  IMultiSelectFieldMeta,
  ISingleSelectFieldMeta,
  ITextFieldMeta
} from '@lark-base-open/js-sdk';
import {Button, Modal, Select} from 'antd';
import {fromByteArray} from 'base64-js';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LoadApp />
  </React.StrictMode>
)

function LoadApp() {
  //cache the selected value
  const selectDefaultValueKey = 'selectField_v1'
  var cacheSelectVal = JSON.parse(localStorage.getItem(selectDefaultValueKey) || "{}") || {}

  // 默认字段名配置
  const defaultFieldNames = ['风格', '题材', '元素', '视觉主体', '呈现型', '核心突出点', '核心文案'];

  const [loading, setLoading] = useState(false);

  // Add a new state for logs
  const [logs, setLogs] = useState<{ recordId: string, index: number, time: string, status: string, message: string, total?: number }[]>([]);

  const [attachmentFieldMetaList, setAttachmentMetaList] = useState<IAttachmentFieldMeta[]>([])
  const [multiSelectFieldMetaList, setMultiSelectMetaList] = useState<IMultiSelectFieldMeta[]>([]);
  const [singleSelectFieldMetaList, setSingleSelectMetaList] = useState<ISingleSelectFieldMeta[]>([]);
  const [textFieldMetaList, setTextMetaList] = useState<ITextFieldMeta[]>([]);

  const [selectAttachmentField, setSelectAttachmentField] = useState<string>(cacheSelectVal['attachment'] || '');
  // 统一的字段配置
  const [tagFieldConfigs, setTagFieldConfigs] = useState<{fieldId: string, fieldName: string}[]>(
    cacheSelectVal['tagFields'] || []
  );

  // Add state for keywords
  const [picPrompt, setPicPrompt] = useState<string>(localStorage.getItem('picPrompt') || '');
  const [vidPrompt, setVidPrompt] = useState<string>(localStorage.getItem('vidPrompt') || '');

  // Add state for keyword options
  const [keywordOptions, setKeywordOptions] = useState<{
    pic: Array<{prompt: string, promptHash: string, createTime: string}>,
    vid: Array<{prompt: string, promptHash: string, createTime: string}>
  }>({pic: [], vid: []});

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

  // Function to fetch keyword options
  const fetchKeywordOptions = async () => {
    try {
      // 使用customApiUrl的域名构建查询关键词的API URL
      const url = new URL(customApiUrl);
      const baseUrl = `${url.protocol}//${url.host}`;
      const apiUrl = `${baseUrl}/feishu-ad-material-tag-plugin/query-keywords`;
      const result = await jsonpRequest(apiUrl, {});
      console.log('Keyword options result:', result);
      if (result.resultCode === 1 && result.data && result.data.keywordMap) {
        setKeywordOptions(result.data.keywordMap);
        console.log('Set keyword options:', result.data.keywordMap);
      } else {
        console.log('API response structure:', result);
      }
    } catch (error) {
      console.error('Failed to fetch keyword options:', error);
    }
  };

  // Handle dropdown selection
  const handlePicPromptSelect = (value: string | null) => {
    if (value !== null) {
      setPicPrompt(value);
    }
  };

  const handleVidPromptSelect = (value: string | null) => {
    if (value && value !== '') {
      setVidPrompt(value);
      localStorage.setItem('vidPrompt', value);
    }
  };

  useEffect(() => {
    const fn = async () => {
      const table = await bitable.base.getActiveTable();
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
    fetchKeywordOptions();
  }, []);

  // 监听字段列表变化，自动匹配默认字段
  useEffect(() => {
    // 确保所有字段列表都已加载
    if (multiSelectFieldMetaList.length > 0 || singleSelectFieldMetaList.length > 0 || textFieldMetaList.length > 0) {
      autoMatchDefaultFields();
    }
  }, [multiSelectFieldMetaList, singleSelectFieldMetaList, textFieldMetaList]);

  const formatFieldAttachmentMetaList = (metaList: IAttachmentFieldMeta[]) => {
    return metaList.map(meta => ({ label: meta.name, value: meta.id }));
  };

  // 格式化所有字段为选项列表
  const formatAllFieldMetaList = () => {
    return [
      ...multiSelectFieldMetaList.map(meta => ({label: meta.name, value: meta.id, type: 'MultiSelect'})),
      ...singleSelectFieldMetaList.map(meta => ({label: meta.name, value: meta.id, type: 'SingleSelect'})),
      ...textFieldMetaList.map(meta => ({label: meta.name, value: meta.id, type: 'Text'}))
    ];
  };

  // 添加字段配置
  const addTagFieldConfig = () => {
    setTagFieldConfigs([...tagFieldConfigs, { fieldId: '', fieldName: '' }]);
  };

  // 删除字段配置
  const removeTagFieldConfig = (index: number) => {
    const newConfigs = tagFieldConfigs.filter((_, i) => i !== index);
    setTagFieldConfigs(newConfigs);
  };

  // 更新字段配置
  const updateTagFieldConfig = (index: number, fieldId: string) => {
    const allFields = formatAllFieldMetaList();
    const selectedField = allFields.find(field => field.value === fieldId);
    const newConfigs = [...tagFieldConfigs];
    newConfigs[index] = {
      fieldId: fieldId,
      fieldName: selectedField ? selectedField.label : ''
    };
    setTagFieldConfigs(newConfigs);
  };

  // 自动匹配默认字段
  const autoMatchDefaultFields = () => {
    // 如果已经有缓存的配置，就不自动匹配了
    if (cacheSelectVal['tagFields'] && cacheSelectVal['tagFields'].length > 0) {
      return;
    }

    const allFields = formatAllFieldMetaList();
    const matchedConfigs: {fieldId: string, fieldName: string}[] = [];

    // 遍历默认字段名，在可用字段中查找匹配
    defaultFieldNames.forEach(defaultName => {
      const matchedField = allFields.find(field => field.label === defaultName);
      if (matchedField) {
        matchedConfigs.push({
          fieldId: matchedField.value,
          fieldName: matchedField.label
        });
      }
    });

    // 只有找到匹配字段时才设置
    if (matchedConfigs.length > 0) {
      setTagFieldConfigs(matchedConfigs);
    }
  };

  const submit = async () => {
    // Clear previous logs
    setLogs([]);

    // update selected value cache
    cacheSelectVal['attachment'] = selectAttachmentField
    cacheSelectVal['tagFields'] = tagFieldConfigs
    localStorage.setItem(selectDefaultValueKey, JSON.stringify(cacheSelectVal))

    if (!selectAttachmentField) {
      Modal.warning({ title: '提示', content: '请选择附件字段', });
      return;
    }
    if (tagFieldConfigs.length === 0) {
      Modal.warning({ title: '提示', content: '请至少选择一个标签字段', });
      return;
    }
    //选择的字段
    const table = await bitable.base.getActiveTable();
    const attachmentField = await table.getField<IAttachmentField>(selectAttachmentField);
    // 获取所有配置的标签字段
    const tagFields: Array<{fieldId: string, field: any, fieldName: string}> = [];
    for (const config of tagFieldConfigs) {
      if (config.fieldId) {
        try {
          const field = await table.getField(config.fieldId);
          tagFields.push({
            fieldId: config.fieldId,
            field: field,
            fieldName: config.fieldName
          });
        } catch (error) {
          console.error(`获取字段失败: ${config.fieldId}`, error);
          Modal.warning({
            title: '提示',
            content: `字段 "${config.fieldName}" 获取失败，请检查字段配置`,
          });
          setLoading(false);
          return;
        }
      }
    }

    // 检查是否有有效的字段配置
    if (tagFields.length === 0) {
      Modal.warning({ title: '提示', content: '没有有效的标签字段配置', });
      return;
    }
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
        //存储每个字段的当前值
        const fieldValues = new Map<string, any>();

        for (const tagField of tagFields) {
          try {
            const value = await tagField.field.getValue(recordId);
            fieldValues.set(tagField.fieldId, value);
            if (value === null) {
              needCallApi = true;
            }
          } catch (error) {
            console.error(`获取字段值失败: ${tagField.fieldId}, recordId: ${recordId}`, error);
            // 如果获取字段值失败，认为字段为空，需要调用API
            fieldValues.set(tagField.fieldId, null);
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
          const imageFieldTagList = [];

          // 遍历所有配置的标签字段
          for (const tagField of tagFields) {
            try {
              const fieldType = FieldType[await tagField.field.getType()];
              const fieldMeta = await tagField.field.getMeta();
              const fieldItem: any = {
                fieldId: tagField.fieldId,
                fieldType: fieldType,
                fieldName: fieldMeta.name
              };

              if (fieldType === 'MultiSelect' || fieldType === 'SingleSelect') {
                fieldItem.fieldOptions = (fieldMeta.property as any).options?.map((option: any) => option.name) || [];
              }

              imageFieldTagList.push(fieldItem);
            } catch (error) {
              console.error(`获取字段元数据失败: ${tagField.fieldId}`, error);
            }
          }

          const response = await fetch(customApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileUrl: urls[0],
              fileName: val[0].name || '',
              fileType: val[0].type.startsWith('image/') ? 'pic' : val[0].type.startsWith('video/') ? 'vid' : val[0].type,
              fileSize: val[0].size || 0,
              imageFieldTagList: imageFieldTagList,
              recordId: recordId,
              tableId: table.id,
              picPrompt: picPrompt,
              vidPrompt: vidPrompt
            })
          });
          const result = await response.json();
          // 计算耗时
          const duration = (new Date().getTime() - startTime.getTime()) / 1000;
          // 记录处理成功的日志
          if(result.resultCode && result.resultCode === 1) {
            // 将响应结果写入复选框
            const data = result.data;
            if (data && data.fieldTags && Array.isArray(data.fieldTags)) {
              for (const fieldTag of data.fieldTags) {
                const { fieldId, fieldType, fieldValues: apiFieldValues } = fieldTag;

                // 根据字段类型确定设置的值
                let valueToSet;
                if (fieldType === 'MultiSelect') {
                  valueToSet = apiFieldValues; // 多选框设置整个数组
                } else if (fieldType === 'SingleSelect') {
                  valueToSet = apiFieldValues[0] || ''; // 单选框设置第一个元素
                } else if (fieldType === 'Text') {
                  valueToSet = apiFieldValues[0] || ''; // 文本框设置第一个元素
                } else {
                  valueToSet = apiFieldValues[0] || ''; // 默认设置第一个元素
                }

                // 根据fieldId找到对应的字段并写入值
                const targetTagField = tagFields.find(tf => tf.fieldId === fieldId);
                if (targetTagField && fieldValues.get(fieldId) === null) {
                  try {
                    await targetTagField.field.setValue(recordId, valueToSet);
                  } catch (error) {
                    console.error(`设置字段值失败: ${fieldId}, recordId: ${recordId}`, error);
                    // 继续处理下一个字段，不中断整个流程
                  }
                }
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
          📎 请选择附件所在字段
        </div>
        <Select 
          style={{ width: '100%', borderRadius: '8px' }} 
          allowClear={true} 
          value={selectAttachmentField} 
          onSelect={setSelectAttachmentField} 
          onClear={() => setSelectAttachmentField('')} 
          options={formatFieldAttachmentMetaList(attachmentFieldMetaList)}
          placeholder="选择附件字段"
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
        <Select
          style={{ width: '100%', marginBottom: '8px' }}
          placeholder="选择图片历史提示词"
          allowClear
          onSelect={handlePicPromptSelect}
          value={null}
          options={keywordOptions.pic ? keywordOptions.pic.map(item => ({
              label: item.createTime,
              value: item.prompt,
              title: item.prompt
            })) : []
          }
        />
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
        <Select
          style={{ width: '100%', marginBottom: '8px' }}
          placeholder="选择视频历史提示词"
          allowClear
          onSelect={handleVidPromptSelect}
          value={null}
          options={keywordOptions.vid ? keywordOptions.vid.map(item => ({
              label: item.createTime,
              value: item.prompt,
              title: item.prompt
            })) : []
          }
        />
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
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>🏷️ 标签字段配置</span>
          <Button
            size="small"
            type="primary"
            onClick={addTagFieldConfig}
            style={{
              borderRadius: '6px',
              fontSize: '12px',
              height: '28px',
              background: '#667eea'
            }}
          >
            + 添加字段
          </Button>
        </div>

        {tagFieldConfigs.map((config, index) => (
          <div key={index} style={{
            marginBottom: index === tagFieldConfigs.length - 1 ? 0 : 16,
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '8px',
            border: '1px solid rgba(102, 126, 234, 0.15)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#2c3e50',
                minWidth: '40px'
              }}>
                字段 {index + 1}
              </div>
              <Select
                style={{ flex: 1 }}
                allowClear
                value={config.fieldId}
                onSelect={(value) => updateTagFieldConfig(index, value)}
                onClear={() => updateTagFieldConfig(index, '')}
                options={formatAllFieldMetaList()}
                placeholder="选择标签字段"
              />
              <Button
                size="small"
                danger
                onClick={() => removeTagFieldConfig(index)}
                style={{
                  minWidth: '28px',
                  height: '28px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </Button>
            </div>
          </div>
        ))}

        {tagFieldConfigs.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            color: '#8e9aaf',
            fontSize: '14px',
            fontStyle: 'italic'
          }}>
            请点击上方“添加字段”按钮来配置标签字段
          </div>
        )}
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
    scriptEl.src = reqUrl+'&v22='+new Date().getTime();
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