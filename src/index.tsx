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

  const [attachmentFieldMetaList, setAttachmentMetaList] = useState<IAttachmentFieldMeta[]>([])
  const [multiSelectFieldMetaList, setMultiSelectMetaList] = useState<IMultiSelectFieldMeta[]>([]);
  const [singleSelectFieldMetaList, setSingleSelectMetaList] = useState<ISingleSelectFieldMeta[]>([]);
  const [textFieldMetaList, setTextMetaList] = useState<ITextFieldMeta[]>([]);

  const [selectAttachmentField, setSelectAttachmentField] = useState<string>(cacheSelectVal['attachment'] || '');
  const [selectElementField, setSelectElementField] = useState<string>(cacheSelectVal['element'] || '');
  const [selectStyleField, setSelectStyleField] = useState<string>(cacheSelectVal['style'] || '');
  const [selectThemeField, setSelectThemeField] = useState<string>(cacheSelectVal['theme'] || '');
  const [selectCopywritingField, setSelectCopywritingField] = useState<string>(cacheSelectVal['copywriting'] || '');


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

    // 开始加载
    setLoading(true);
    let skipItems = 0;
    try {
      //遍历每一行
      for (const recordId of recordIdList) {
        //附件字段是否存在
        const val = await attachmentField.getValue(recordId);
        if (null === val || val.length === 0 || !val) {
          continue;
        }
        const urls = await attachmentField.getAttachmentUrls(recordId);
        if (null === urls || urls.length === 0) {
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
        //是否选择的字段已经存在了元素，选择的字段都有值则不会调用api
        if (!needCallApi) {
          skipItems++;
          continue;
        }
        //调用第三方API
        try {
          const result = await jsonpRequest('http://localhost:8080/feishu-ad-material-tag-plugin/image-tag', {
            files: urls,
            recordId: recordId,
            tableId: table.id
          });
          // 将响应结果写入复选框
          if (elementField && elementVal === null) {
            await elementField.setValue(recordId, Array.isArray(result.elementList) ? result.elementList : []);
          }
          if (styleField && styleVal === null) {
            await styleField.setValue(recordId, Array.isArray(result.styleList) ? result.styleList : []);
          }
          if (themeField && themeVal === null) {
            await themeField.setValue(recordId, Array.isArray(result.themeList) ? result.themeList : []);
          }
          if (copywritingField && copywritingVal === null) {
            await copywritingField.setValue(recordId, Array.isArray(result.copyWritingList) ? JSON.stringify(result.copyWritingList) : '');
          }
        } catch (error) {
          console.error('API调用失败:', error);
        }
      }
    } finally {
      if (skipItems === recordIdList.length) {
        Modal.warning({ title: '提示', content: '没有需要处理的行', });
      }
      // 结束加载
      setLoading(false);
    }
  };

  return <div style={{}}>

    <div style={{ width: 200, margin: '0 auto', textAlign: 'left' }}>

      <div style={{ marginTop: 10 }}>
        <div>图片字段</div>
        <Select style={{ width: '100%' }} allowClear={true} value={selectAttachmentField} onSelect={setSelectAttachmentField} options={formatFieldAttachmentMetaList(attachmentFieldMetaList)} />
      </div>
      <div style={{ marginTop: 10 }}>
        <div>元素</div>
        <Select style={{ width: '100%' }} allowClear value={selectElementField} onSelect={setSelectElementField} options={formatFieldMultiSelectMetaList(multiSelectFieldMetaList)} />
      </div>

      {/* <div style={{ margin: 10 }}>
      <div>风格</div>
      <Select style={{ width: 120 }} allowClear onSelect={setSelectStyleField} options={formatFieldMultiSelectMetaList(multiSelectFieldMetaList)} />
    </div>
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
  </div>
}

async function jsonpRequest(reqUrl: string, params: Record<string, any>, timeout: number = 30000): Promise<any> {
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
      ? `${reqUrl}&X-CHOICE-TAG=chen&base64=${base64Str}`
      : `${reqUrl}?X-CHOICE-TAG=chen&base64=${base64Str}`;

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
      reject(new Error('JSONP request timeout'));
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