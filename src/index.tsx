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

  // Add state for custom API URL
  const [customApiUrl, setCustomApiUrl] = useState<string>(localStorage.getItem('customApiUrl') || 'https://feishu-g-plugin-zacgffzypr.cn-shenzhen.fcapp.run/feishu-ad-material-tag-plugin/image-tag');

  // Function to handle custom API URL changes
  const handleCustomApiUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setCustomApiUrl(newUrl);
    localStorage.setItem('customApiUrl', newUrl);
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
    localStorage.setItem(selectDefaultValueKey, JSON.stringify(cacheSelectVal))

    if (!selectAttachmentField) {
      Modal.warning({ title: '提示', content: '请选择图片字段', });
      return;
    }
    if (!selectElementField && !selectStyleField && !selectThemeField && !selectCopywritingField) {
      Modal.warning({ title: '提示', content: '元素、风格、题材、文案至少选择一个', });
      return;
    }
    //选择的字段
    const table = await bitable.base.getActiveTable();
    const attachmentField = await table.getField<IAttachmentField>(selectAttachmentField);
    const elementField = selectElementField ? await table.getField<IMultiSelectField>(selectElementField) : null;
    const styleField = selectStyleField ? await table.getField<IMultiSelectField>(selectStyleField) : null;
    const themeField = selectThemeField ? await table.getField<IMultiSelectField>(selectThemeField) : null;
    const copywritingField = selectCopywritingField ? await table.getField<ITextField>(selectCopywritingField) : null;
    const recordIdList = await table.getRecordIdList();
    const totalRecords = recordIdList.length;

    // 开始加载
    setLoading(true);
    let skipItems = 0;
    let failedItems = 0;
    try {
      //遍历每一行
      for (let i = 0; i < recordIdList.length; i++) {
        const recordId = recordIdList[i];

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
        const containNonImage = val.some(file => !file.type.startsWith('image/'));
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
            tableId: table.id
          });
          // 将响应结果写入复选框
          if (elementField && elementVal === null) {
            await elementField.setValue(recordId, Array.isArray(result.elementList) ? result.elementList.filter((element: any, i: any) => i === result.elementList.indexOf(element)) : []);
          }
          if (styleField && styleVal === null) {
            await styleField.setValue(recordId, Array.isArray(result.styleList) ? result.styleList.filter((element: any, i: any) => i === result.styleList.indexOf(element)) : []);
          }
          if (themeField && themeVal === null) {
            await themeField.setValue(recordId, Array.isArray(result.themeList) ? result.themeList.filter((element: any, i: any) => i === result.themeList.indexOf(element)) : []);
          }
          if (copywritingField && copywritingVal === null) {
            await copywritingField.setValue(recordId, Array.isArray(result.copyWritingList) ? JSON.stringify(result.copyWritingList) : '');
          }
          // 计算耗时
          const duration = (new Date().getTime() - startTime.getTime()) / 1000;

          // 记录处理成功的日志
          setLogs(prev => [...prev, {
            recordId,
            index: i + 1,
            time: new Date().toLocaleTimeString(),
            status: 'success',
            message: `处理完成 (耗时: ${duration.toFixed(2)}秒)` + (result.msg ? `: ${result.msg}` : ''),
            total: totalRecords
          }]);
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

  return <div style={{}}>

    <div style={{ width: 200, margin: '0 auto', textAlign: 'left' }}>

      <div style={{ marginTop: 10 }}>
        <div>请选择图片所在字段</div>
        <Select style={{ width: '100%' }} allowClear={true} value={selectAttachmentField} onSelect={setSelectAttachmentField} options={formatFieldAttachmentMetaList(attachmentFieldMetaList)} />
      </div>
      <div style={{ marginTop: 10 }}>
        <div>请选择元素标签回写字段</div>
        <Select style={{ width: '100%' }} allowClear value={selectElementField} onSelect={setSelectElementField} options={formatFieldMultiSelectMetaList(multiSelectFieldMetaList)} />
      </div>
      <div style={{ marginTop: 10 }}>
        <div>请选择风格标签回写字段</div>
        <Select style={{ width: '100%' }} allowClear value={selectStyleField} onSelect={setSelectStyleField} options={formatFieldMultiSelectMetaList(multiSelectFieldMetaList)} />
      </div>

      {/* 
    <div style={{ margin: 10 }}>
      <div>题材</div>
      <Select style={{ width: 120 }} allowClear onSelect={setSelectThemeField} options={formatFieldMultiSelectMetaList(multiSelectFieldMetaList)} />
    </div>
    <div style={{ margin: 10 }}>
      <div>文案</div>
      <Select style={{ width: 120 }} allowClear onSelect={setSelectCopywritingField} options={formatFieldTextMetaList(textFieldMetaList)} />
    </div> */}
      <div style={{ marginTop: 20 }}>
        <Button style={{ width: 200 }} type="primary" onClick={submit} loading={loading}>执行处理</Button>
      </div>
    </div>

    {/* 新增日志区域 */}
    <div style={{ padding: 10, marginTop: 20, width: '100%' }}>
      <div style={{ borderBottom: '1px solid #eee', paddingBottom: 5, marginBottom: 10 }}>处理日志</div>
      <div
        ref={logContainerRef}
        style={{
          maxHeight: 205,
          overflowY: 'auto',
          border: '1px solid #eee',
          padding: 10,
          borderRadius: 4,
          fontSize: '12px'
        }}
      >
        {logs.length === 0 ?
          <div style={{ color: '#999', textAlign: 'center' }}>暂无日志</div> :
          logs.map((log, index) => (
            <div key={index} style={{
              marginBottom: 5,
              padding: 5,
              backgroundColor: log.status === 'error' ? '#fff2f0' :
                log.status === 'success' ? '#f6ffed' :
                  log.status === 'processing' ? '#e6f7ff' : '#f5f5f5',
              borderRadius: 2
            }}>
              <span style={{ color: '#666' }}>{log.time}</span> -
              <span>{log.total}/{log.index}</span> -
              <span style={{
                color: log.status === 'error' ? '#f5222d' :
                  log.status === 'success' ? '#52c41a' :
                    log.status === 'processing' ? '#1890ff' : '#8c8c8c'
              }}>
                {log.status === 'error' ? '错误' :
                  log.status === 'success' ? '成功' :
                    log.status === 'processing' ? '处理中' : '跳过'}
              </span> -
              <span>{log.message}</span>
            </div>
          ))
        }
      </div>
    </div>

    {/* Custom API URL input field fixed at the bottom */}
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '0',
      width: '100%',
      padding: '0 10px',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      borderTop: '1px solid #eee',
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '5px 0' }}>
        <label style={{ fontSize: '12px', marginRight: '5px', whiteSpace: 'nowrap' }}>自定义服务器API地址:</label>
        <input
          type="text"
          value={customApiUrl}
          onChange={handleCustomApiUrlChange}
          style={{
            flex: 1,
            padding: '4px 8px',
            fontSize: '12px',
            border: '1px solid #d9d9d9',
            borderRadius: '4px'
          }}
          placeholder="请输入自定义API地址"
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