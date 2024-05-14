import { LightningElement } from 'lwc';
import loadDataById from '@salesforce/apex/InfiniteLoadDataController.loadDataById';
import loadMoreData from '@salesforce/apex/InfiniteLoadDataController.loadMoreData';
import countOfAccounts from '@salesforce/apex/InfiniteLoadDataController.countOfAccounts';

const COLUMNS = [
    { label: 'Name', fieldName: 'Name' },
    { label: 'Industry', fieldName: 'Industry' },
    { label: 'Rating', fieldName: 'Rating' },
];

export default class InfiniteLoadingDataTable extends LightningElement {
    data = [];
    columns = COLUMNS;
    totalRecords = 0;
    recordsLoaded = 0;

    connectedCallback() {
        this.loadData();
    }

    async loadData() {

        try {
            this.totalRecords = await countOfAccounts();
            this.data = await loadDataById();
            this.recordsLoaded = this.data.length;
        } catch (error) {
            console.log("Error while loading", error);
        }

    }

    async loadMore(event) {
        try {
            const { target } = event;
            target.isLoading = true;
            let currentRecords = this.data;
            let lastRecord = currentRecords[currentRecords.length - 1];
            let newRecords = await loadMoreData({
                lastName: lastRecord.Name,
                lastId: lastRecord.Id
            });
            this.data = [...currentRecords, ...newRecords];
            this.recordsLoaded = this.data.length;
            target.isLoading = false;
        } catch (error) {

        }
    }

}