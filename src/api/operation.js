// 划词标记操作类型接口
export default {
    // 新增实体  
    addEntity: {
        url: '/mark/addEntity',
        method: 'post'
    },
    // 编辑实体
    editEntity: {
        url: '/mark/updateEntityLabelById',
        method: 'post',
    },
    // 删除实体 
    deleteEntity: {
        url: '/mark/deleteEntity?entityId=:entityId',
        method: 'delete'
    },
    // 新增模块 
    addModule: {
        url: '/mark/addModule',
        method: 'post'
    },
    // 新增关系 
    addEntityRelation: {
        url: '/mark/addEntityRelation',
        method: 'post'
    },
    // 编辑关系 
    updateEntityRelation: {
        url: '/mark/updateEntityRelation',
        method: 'post'
    },
    // 删除关系 
    deleteEntityRelation: {
        url: '/mark/deleteEntityRelation?entityRelationId=:entityRelationId',
        method: 'delete'
    },
    // 手动建立映射
    buildEntityMap: {
        url: '/mark/buildEntityMap',
        method: 'post'
    },
};