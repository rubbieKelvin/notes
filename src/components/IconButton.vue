<template>
    <button @click="$emit('click')" class=" bg-gray-100 flex items-center justify-center rounded-md hover:bg-gray-200">
        <slot/>
    </button>
</template>