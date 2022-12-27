// 划词查询接口
export default {
    // 查询子模块 （查询分页数据）
    moduleList: {
        url: '/mark/module/list',
        method: 'get'
    },
    // 查询实体列表 （显示在右侧的实体列表）
    entityList: {
        url: '/mark/entity/list',
        method: 'get'
    },
    // 查询实体关系列表 （用于标注图中关系的列表）
    entityRelationList: {
        url: '/mark/entityRelation/list',
        method: 'get'
    },
    // 查询无关联关系实体列表 （没有关系的实体）
    entityIsolationList: {
        url: '/mark/entityIsolation/list',
        method: 'get'
    },
    // 实体关系结构化显示 （右侧的结构化数据）
    entityStructure: {
        url: '/mark/entity/structure',
        method: 'get'
    },
    // 病案列表 （病案列表）
    markWordList: {
        url: '/mark/markWord/list',
        method: 'post'
    },
    // 关系下拉框 （左侧关系下拉框）
    relationComboBox: {
        url: '/mark/relation/comboBox',
        method: 'get'
    },
    // 标签下拉框 （左侧标签下拉框）
    labelComboBox: {
        url: '/mark/label/comboBox',
        method: 'get'
    },
};