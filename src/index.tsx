import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { bitable, FieldType, IAttachmentField, IAttachmentFieldMeta, IMultiSelectField, IMultiSelectFieldMeta, ISingleSelectField, ISingleSelectFieldMeta, ITextField, ITextFieldMeta } from '@lark-base-open/js-sdk';
import { AlertProps, Button, Select, Modal } from 'antd';

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
          continue;
        }
        //调用第三方API
        try {
          const result = await jsonpRequest('http://localhost:8080/feishu-ad-material-tag-plugin/image-tag', {
            files: urls,
            recordId: recordId
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
      // 结束加载
      setLoading(false);
    }
  };

  async function jsonpRequest(reqUrl: string, params: Record<string, any>): Promise<any> {
    return new Promise((resolve, reject) => {
      // 创建随机函数名
      if (!(window as any)._random_fun_create_prefix_incr) {
        (window as any)._random_fun_create_prefix_incr = 0;
      }
      (window as any)._random_fun_create_prefix_incr++;
      const funName = 'ras_79_8fa61fSDa62_' + (window as any)._random_fun_create_prefix_incr;
      (window as any)[funName] = function (res: any) {
        resolve(res);
      };

      // params 必须是 JSON 对象
      params['fun'] = funName;
      // params['reqNo'] = urlPayload.reqNo;
      // params['accessToken'] = urlPayload.accessToken;

      // 由于找不到 Base64 对象，使用浏览器内置的 btoa 方法进行 Base64 编码 
      const base64Str = btoa(unescape(encodeURIComponent(JSON.stringify(params))));
      if (reqUrl.indexOf("?") > 1) {
        reqUrl = reqUrl + "&X-CHOICE-TAG=chen&base64=" + base64Str;
      } else {
        reqUrl = reqUrl + "?X-CHOICE-TAG=chen&base64=" + base64Str;
      }

      // 创建 script 元素以调用 jsonp
      const scriptEl = document.createElement('script');
      scriptEl.src = reqUrl;
      // scriptEl.crossOrigin = "anonymous";
      scriptEl.defer = true;
      scriptEl.async = true;
      scriptEl.onerror = function (err: Event | string) {
        reject(err);
      };
      document.getElementsByTagName('head')[0].appendChild(scriptEl);
    });
  }

  return <div>
    <div style={{ margin: 10 }}>
      <div>图片字段</div>
      <Select style={{ width: 200 }} allowClear={true} value={selectAttachmentField} onSelect={setSelectAttachmentField} options={formatFieldAttachmentMetaList(attachmentFieldMetaList)} />
    </div>
    <div style={{ margin: 10 }}>
      <div>元素</div>
      <Select style={{ width: 200 }} allowClear value={selectElementField} onSelect={setSelectElementField} options={formatFieldMultiSelectMetaList(multiSelectFieldMetaList)} />
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
    <div style={{ margin: 10, marginTop: 20 }}>
      <Button style={{ width: 200 }} type="primary" onClick={submit} loading={loading}>批量提取</Button>
    </div>
  </div>
}